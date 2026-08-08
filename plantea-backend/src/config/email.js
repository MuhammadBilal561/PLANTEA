// =============================================================
// src/config/email.js
// Plantea — Email Service Configuration
// =============================================================
// Responsibility: Configure and provide email sending functionality
//   using nodemailer for OTP and notification emails.
//
// SE Principle — Configuration Separation:
//   Email configuration is centralized here, making it easy to
//   switch providers or update settings without touching business logic.
// =============================================================

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email using the configured transporter.
 * 
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body (optional)
 * @param {string} options.text - Plain text body
 * @returns {Promise<object>} - Nodemailer send result
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
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
