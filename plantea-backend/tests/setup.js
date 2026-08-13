// =============================================================
// tests/setup.js
// Plantea — Jest global setup.
// Forces the API to use a throwaway SQLite database so tests never
// touch the live dev database, and binds the server to an ephemeral
// high port to avoid clashing with a running dev server.
// =============================================================
const path = require('path');
const fs = require('fs');

const testDb = path.join('/tmp', `plantea-test-${process.pid}.db`);
fs.rmSync(testDb, { force: true });

process.env.PLANTEA_DB_PATH = testDb;
process.env.PORT = String(4000 + (process.pid % 1000));
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
process.env.CORS_ORIGINS = '*';
