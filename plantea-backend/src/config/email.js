// =============================================================
// src/config/email.js
// Plantea — Email Service Configuration
// =============================================================
// Responsibility: Send transactional emails (OTP codes) using
//   nodemailer. If SMTP is not configured, email is gracefully
//   skipped so the rest of the app keeps working (graceful
//   degradation — the app must stay usable for a demo).
// =============================================================

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const smtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

// Create a lazy transporter only when SMTP is configured.
let transporter = null;
function getTransporter() {
  if (!smtpConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send an email using the configured transporter.
 * Throws a descriptive error when SMTP is not configured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  if (!t) {
    const err = new Error('SMTP not configured');
    err.code = 'NO_SMTP';
    throw err;
  }

  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || 'Plantea <noreply@plantea.pk>',
      to,
      subject,
      html,
      text,
    });

    logger.info(`Email sent to ${to}: ${subject}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

module.exports = { sendEmail };
