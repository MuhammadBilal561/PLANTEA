-- =============================================================
-- 002_otp_verifications.sql
-- Plantea — OTP Verifications Table
-- =============================================================
-- Purpose: Store OTP codes for password reset functionality
-- Run this in Supabase SQL Editor after running the main schema
-- =============================================================

-- Create otp_verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(150) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);

-- Create index on created_at for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON otp_verifications(created_at);

-- Add comment to table
COMMENT ON TABLE otp_verifications IS 'Stores hashed OTP codes for password reset with expiration tracking';

-- Add comments to columns
COMMENT ON COLUMN otp_verifications.email IS 'User email address requesting password reset';
COMMENT ON COLUMN otp_verifications.otp_hash IS 'Bcrypt hashed OTP code (never store plain text)';
COMMENT ON COLUMN otp_verifications.expires_at IS 'OTP expiration timestamp (10 minutes from creation)';
COMMENT ON COLUMN otp_verifications.used IS 'Whether this OTP has been used (prevents reuse)';
COMMENT ON COLUMN otp_verifications.created_at IS 'When the OTP was generated (for rate limiting)';
