// =============================================================
// src/modules/auth/auth.service.js
// Plantea — Authentication Business Logic
// =============================================================
// Responsibility: Register, login, forgot-password (OTP), reset.
// Data access now goes through the SQLite layer (src/config/db).
// =============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, get, run, uuid } = require('../../config/db');
const logger = require('../../utils/logger');
const { sendEmail } = require('../../config/email');

const SALT_ROUNDS = 12;


/**
 * Register a new user (buyer, seller, or rider).
 * The platform is 100% free — no subscription or commission
 * records are created for new sellers.
 *
 * @returns {object} - { user, token }
 */
const registerUser = async (userData) => {
  const { full_name, email, phone, password, role, city } = userData;

  // Step 1: Reject duplicate email or phone
  const existing = get('SELECT id FROM users WHERE email = ? OR phone = ?', [email, phone]);
  if (existing) {
    const err = new Error('An account with this email or phone already exists.');
    err.statusCode = 409;
    throw err;
  }

  // Step 2: Hash password — NEVER store plain text
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Step 3: Insert new user
  const id = uuid();
  run(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role, city)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, full_name, email, phone, hashedPassword, role, city || 'Lahore']
  );

  const newUser = get(
    'SELECT id, full_name, email, role, city, created_at FROM users WHERE id = ?',
    [id]
  );

  // Step 4: Generate JWT
  const token = generateToken(newUser);

  logger.info(`New ${role} registered: ${email}`);
  return { user: newUser, token };
};


/**
 * Log in an existing user.
 * @returns {object} - { user, token }
 */
const loginUser = async (email, password) => {
  const user = get(
    'SELECT id, full_name, email, role, city, is_active, password_hash FROM users WHERE email = ?',
    [email]
  );

  const invalidCredentialsError = new Error('Invalid email or password.');
  invalidCredentialsError.statusCode = 401;

  if (!user) throw invalidCredentialsError;

  if (!user.is_active) {
    const err = new Error('Your account has been deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) throw invalidCredentialsError;

  delete user.password_hash;
  const token = generateToken(user);

  logger.info(`User logged in: ${email} (${user.role})`);
  return { user, token };
};


/**
 * Internal helper: Generate a signed JWT token.
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id:    user.id,
      email: user.email,
      role:  user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};


/**
 * Forgot Password — send a 6-digit OTP to the user's email.
 */
const forgotPassword = async (email) => {
  const user = get('SELECT id, email FROM users WHERE email = ?', [email]);
  if (!user) {
    const err = new Error('No account with this email');
    err.statusCode = 404;
    throw err;
  }

  // Rate limit: max 3 OTP requests in 15 minutes
  const recentCount = get(
    `SELECT COUNT(*) AS c FROM otp_verifications
     WHERE email = ? AND used = 0 AND created_at >= datetime('now', '-15 minutes')`,
    [email]
  ).c;

  if (recentCount >= 3) {
    const err = new Error('Too many attempts. Try again in 15 minutes');
    err.statusCode = 429;
    throw err;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  run(
    `INSERT INTO otp_verifications (id, email, otp_hash, expires_at, used) VALUES (?, ?, ?, ?, 0)`,
    [uuid(), email, otpHash, expiresAt]
  );

  try {
    await sendEmail({
      to: email,
      subject: 'Your Plantea Reset Code',
      text: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #276044;">Password Reset Request</h2>
          <p>Your password reset code is:</p>
          <div style="background-color: #EDF8F3; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #276044; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #D6F0E2; margin: 30px 0;">
          <p style="color: #7A9487; font-size: 12px;">Plantea - Pakistan's Smart Plant Marketplace</p>
        </div>
      `,
    });
    logger.info(`Password reset OTP sent to ${email}`);
  } catch (emailError) {
    logger.error('Failed to send OTP email:', emailError.message);

    // No SMTP configured? Fall back to logging the code in development
    // so the flow is still testable end-to-end for a demo.
    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_USER) {
      logger.warn('SMTP not configured — OTP for demo:', otp);
      return { message: 'Reset code sent to your email' };
    }

    const err = new Error('Failed to send reset code. Please try again.');
    err.statusCode = 500;
    throw err;
  }

  return { message: 'Reset code sent to your email' };
};


/**
 * Verify OTP and return a short-lived reset token.
 */
const verifyOtp = async (email, otp) => {
  const otpRecord = get(
    `SELECT * FROM otp_verifications
     WHERE email = ? AND used = 0
     ORDER BY created_at DESC LIMIT 1`,
    [email]
  );

  if (!otpRecord) {
    const err = new Error('Invalid or expired code');
    err.statusCode = 400;
    throw err;
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    const err = new Error('Code has expired. Request a new one');
    err.statusCode = 400;
    throw err;
  }

  const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);
  if (!isValid) {
    const err = new Error('Incorrect code');
    err.statusCode = 400;
    throw err;
  }

  run('UPDATE otp_verifications SET used = 1 WHERE id = ?', [otpRecord.id]);

  const resetToken = jwt.sign(
    { email, purpose: 'reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  logger.info(`OTP verified for ${email}`);
  return { reset_token: resetToken };
};


/**
 * Reset Password — update the user's password using the reset token.
 */
const resetPassword = async (resetToken, newPassword) => {
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (error) {
    const err = new Error('Reset link expired');
    err.statusCode = 400;
    throw err;
  }

  if (payload.purpose !== 'reset') {
    const err = new Error('Invalid reset token');
    err.statusCode = 400;
    throw err;
  }

  if (
    newPassword.length < 8 ||
    !/[a-zA-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    const err = new Error('Password must be at least 8 characters with a letter and a number');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const info = run('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, payload.email]);
  if (info.changes === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  logger.info(`Password reset successful for ${payload.email}`);
  return { message: 'Password updated successfully' };
};


module.exports = { registerUser, loginUser, forgotPassword, verifyOtp, resetPassword };
