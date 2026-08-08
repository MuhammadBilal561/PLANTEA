// =============================================================
// src/modules/auth/auth.service.js
// Plantea — Authentication Business Logic
// =============================================================
// Responsibility: Handle user registration and login logic.
//
// SE Principle — Separation of Concerns (3-Layer Pattern):
//   Service layer  → business logic lives here
//   Controller     → handles HTTP request/response only
//   Database       → Supabase handles storage
//
// Refactoring Note:
//   Originally, all logic would sit in the controller (God Function
//   code smell). Extracting into a service makes each piece
//   independently testable and replaceable.
// =============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../../config/supabase');
const logger = require('../../utils/logger');
const { sendEmail } = require('../../config/email');

// Number of salt rounds for bcrypt — 12 is the industry standard balance
// between security and performance
const SALT_ROUNDS = 12;


/**
 * Register a new user (buyer, seller, or rider).
 *
 * Steps:
 *  1. Check if email or phone is already registered
 *  2. Hash the password with bcrypt
 *  3. Insert user into Supabase users table
 *  4. If seller, create their default free subscription
 *  5. Return a signed JWT token
 *
 * @param {object} userData - { full_name, email, phone, password, role, city }
 * @returns {object} - { user, token }
 */
const registerUser = async (userData) => {
  const { full_name, email, phone, password, role, city } = userData;

  // Step 1: Check for duplicate email
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    // Throw a structured error — controller will catch and respond
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409; // Conflict
    throw err;
  }

  // Step 2: Hash password — NEVER store plain text passwords
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Step 3: Insert new user into the database
  // Note: password_hash is a separate column not shown in schema above
  // Supabase Auth can also handle this — here we do manual for full control
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      full_name,
      email,
      phone,
      password_hash: hashedPassword,
      role,
      city: city || 'Lahore',
    })
    .select('id, full_name, email, role, city, created_at')
    .single();

  if (insertError) {
    logger.error('Failed to insert new user', insertError.message);
    const err = new Error('Registration failed. Please try again.');
    err.statusCode = 500;
    throw err;
  }

  // Step 4: If seller, create their default free subscription record
  if (role === 'seller') {
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        seller_id: newUser.id,
        tier: 'free',
        commission_rate: parseFloat(process.env.COMMISSION_FREE_TIER) || 10.00,
      });

    if (subError) {
      // Log but don't fail registration — subscription can be fixed later
      logger.warn('Subscription creation failed for new seller', subError.message);
    }
  }

  // Step 5: Generate JWT token — expires based on .env setting
  const token = generateToken(newUser);

  logger.info(`New ${role} registered: ${email}`);

  return { user: newUser, token };
};


/**
 * Log in an existing user.
 *
 * Steps:
 *  1. Find user by email
 *  2. Compare submitted password with stored hash
 *  3. Return JWT token if valid
 *
 * @param {string} email
 * @param {string} password
 * @returns {object} - { user, token }
 */
const loginUser = async (email, password) => {

  // Step 1: Fetch user by email, include password_hash for comparison
  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, city, is_active, password_hash')
    .eq('email', email)
    .single();

  // Use same error message for both "not found" and "wrong password"
  // This prevents email enumeration attacks (attacker can't tell which one failed)
  const invalidCredentialsError = new Error('Invalid email or password.');
  invalidCredentialsError.statusCode = 401;

  if (error || !user) throw invalidCredentialsError;

  // Step 2: Check if account is active (not banned/disabled)
  if (!user.is_active) {
    const err = new Error('Your account has been deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  // Step 3: Compare password
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) throw invalidCredentialsError;

  // Remove password hash from the response — never send to client
  delete user.password_hash;

  // Step 4: Generate and return JWT
  const token = generateToken(user);

  logger.info(`User logged in: ${email} (${user.role})`);

  return { user, token };
};


/**
 * Internal helper: Generate a signed JWT token.
 * Extracted as a helper to avoid code duplication (DRY principle).
 *
 * @param {object} user - User object with id, role, email
 * @returns {string} - Signed JWT token
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
 * Forgot Password - Send OTP to user's email.
 * 
 * Steps:
 *  1. Check if user exists
 *  2. Rate limit check (max 3 attempts in 15 minutes)
 *  3. Generate 6-digit OTP
 *  4. Hash OTP and store in database
 *  5. Send OTP via email
 * 
 * @param {string} email - User's email address
 * @returns {object} - { message }
 */
const forgotPassword = async (email) => {
  // Step 1: Check if user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();

  if (userError || !user) {
    const err = new Error('No account with this email');
    err.statusCode = 404;
    throw err;
  }

  // Step 2: Rate limit check - max 3 OTP requests in 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  
  const { data: recentOtps, error: countError } = await supabase
    .from('otp_verifications')
    .select('id')
    .eq('email', email)
    .gte('created_at', fifteenMinutesAgo);

  if (countError) {
    logger.error('Failed to check OTP rate limit:', countError.message);
  }

  if (recentOtps && recentOtps.length >= 3) {
    const err = new Error('Too many attempts. Try again in 15 minutes');
    err.statusCode = 429;
    throw err;
  }

  // Step 3: Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Step 4: Hash OTP
  const otpHash = await bcrypt.hash(otp, 10);

  // Step 5: Store OTP in database
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  const { error: insertError } = await supabase
    .from('otp_verifications')
    .insert({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

  if (insertError) {
    logger.error('Failed to store OTP:', insertError.message);
    const err = new Error('Failed to process request. Please try again.');
    err.statusCode = 500;
    throw err;
  }

  // Step 6: Send email with OTP
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
    const err = new Error('Failed to send reset code. Please try again.');
    err.statusCode = 500;
    throw err;
  }

  return { message: 'Reset code sent to your email' };
};


/**
 * Verify OTP - Validate the OTP code and return a reset token.
 * 
 * Steps:
 *  1. Find latest unused OTP for the email
 *  2. Check if OTP has expired
 *  3. Compare submitted OTP with hashed OTP
 *  4. Mark OTP as used
 *  5. Generate and return reset token
 * 
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @returns {object} - { reset_token }
 */
const verifyOtp = async (email, otp) => {
  // Step 1: Find latest unused OTP
  const { data: otpRecords, error: fetchError } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('email', email)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError || !otpRecords || otpRecords.length === 0) {
    const err = new Error('Invalid or expired code');
    err.statusCode = 400;
    throw err;
  }

  const otpRecord = otpRecords[0];

  // Step 2: Check if OTP has expired
  const now = new Date();
  const expiresAt = new Date(otpRecord.expires_at);

  if (expiresAt < now) {
    const err = new Error('Code has expired. Request a new one');
    err.statusCode = 400;
    throw err;
  }

  // Step 3: Compare OTP
  const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

  if (!isValid) {
    const err = new Error('Incorrect code');
    err.statusCode = 400;
    throw err;
  }

  // Step 4: Mark OTP as used
  const { error: updateError } = await supabase
    .from('otp_verifications')
    .update({ used: true })
    .eq('id', otpRecord.id);

  if (updateError) {
    logger.error('Failed to mark OTP as used:', updateError.message);
  }

  // Step 5: Generate reset token (valid for 15 minutes)
  const resetToken = jwt.sign(
    { email, purpose: 'reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  logger.info(`OTP verified for ${email}`);

  return { reset_token: resetToken };
};


/**
 * Reset Password - Update user's password using reset token.
 * 
 * Steps:
 *  1. Verify reset token
 *  2. Validate new password
 *  3. Hash new password
 *  4. Update user's password in database
 * 
 * @param {string} resetToken - JWT reset token from verifyOtp
 * @param {string} newPassword - New password
 * @returns {object} - { message }
 */
const resetPassword = async (resetToken, newPassword) => {
  // Step 1: Verify reset token
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (error) {
    const err = new Error('Reset link expired');
    err.statusCode = 400;
    throw err;
  }

  // Step 2: Check token purpose
  if (payload.purpose !== 'reset') {
    const err = new Error('Invalid reset token');
    err.statusCode = 400;
    throw err;
  }

  // Step 3: Validate new password
  if (
    newPassword.length < 8 ||
    !/[a-zA-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    const err = new Error('Password must be at least 8 characters with a letter and a number');
    err.statusCode = 400;
    throw err;
  }

  // Step 4: Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Step 5: Update user's password
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('email', payload.email);

  if (updateError) {
    logger.error('Failed to update password:', updateError.message);
    const err = new Error('Failed to update password. Please try again.');
    err.statusCode = 500;
    throw err;
  }

  logger.info(`Password reset successful for ${payload.email}`);

  return { message: 'Password updated successfully' };
};


module.exports = { registerUser, loginUser, forgotPassword, verifyOtp, resetPassword };
