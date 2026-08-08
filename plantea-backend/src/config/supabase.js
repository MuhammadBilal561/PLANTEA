// =============================================================
// src/config/supabase.js
// Plantea — Supabase Client Configuration
// =============================================================
// Responsibility: Create and export ONE shared Supabase client.
//
// SE Principle — Low Coupling:
//   Every module imports this single client instead of creating
//   its own connection. If we switch databases, only this file
//   changes — no other module is affected.
// =============================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate required environment variables at startup
// Fail fast: better to crash here than get cryptic errors later
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[CONFIG ERROR] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1); // Stop the server — cannot run without a database
}

// Service key bypasses Row Level Security — used only in backend
// Never expose this key in frontend or client-side code
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = supabase;
