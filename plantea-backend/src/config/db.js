// =============================================================
// src/config/db.js
// Plantea — SQLite Data Layer (self-contained, zero-cost)
// =============================================================
// Responsibility: Own the SQLite connection, create the schema,
//   seed demo data, and expose small query helpers.
//
// Why SQLite? This project must run 100% free with no external
//   accounts, no credit cards, and no third-party dependencies.
//   SQLite gives us a real, relational, transactional database
//   that works out of the box — perfect for a sellable, demoable
//   product. To swap in PostgreSQL/Supabase later, only this file
//   changes (Low Coupling principle).
// =============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const logger = require('../utils/logger');

// DB file lives in backend/data/plantea.db (gitignored)
const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.PLANTEA_DB_PATH || path.join(DB_DIR, 'plantea.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('buyer','seller','rider','admin')),
  city          TEXT NOT NULL DEFAULT 'Lahore',
  is_active     INTEGER NOT NULL DEFAULT 1,
  is_verified   INTEGER NOT NULL DEFAULT 0,
  bio           TEXT,
  avatar_url    TEXT,
  address       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plants (
  id                 TEXT PRIMARY KEY,
  seller_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  scientific_name    TEXT,
  description        TEXT,
  price_pkr          REAL NOT NULL CHECK (price_pkr > 0),
  original_price_pkr REAL,
  discount_pct       REAL NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 90),
  stock_quantity     INTEGER NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
  category           TEXT,
  city               TEXT NOT NULL DEFAULT 'Lahore',
  ai_verified        INTEGER NOT NULL DEFAULT 0,
  health_score       INTEGER CHECK (health_score BETWEEN 0 AND 100),
  image_url          TEXT,
  is_available       INTEGER NOT NULL DEFAULT 1,
  is_organic         INTEGER NOT NULL DEFAULT 0,
  featured           INTEGER NOT NULL DEFAULT 0,
  care_level         TEXT DEFAULT 'Easy',
  views_count        INTEGER NOT NULL DEFAULT 0,
  sold_count         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  buyer_id          TEXT NOT NULL REFERENCES users(id),
  plant_id          TEXT NOT NULL REFERENCES plants(id),
  rider_id          TEXT REFERENCES users(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','picked_up','in_transit','delivered','cancelled')),
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_order    REAL NOT NULL,
  delivery_fee_pkr  REAL NOT NULL DEFAULT 0,
  commission_pkr    REAL NOT NULL DEFAULT 0,
  discount_pkr      REAL NOT NULL DEFAULT 0,
  total_pkr         REAL NOT NULL,
  delivery_address  TEXT NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'COD',
  coupon_code       TEXT,
  refund_status     TEXT NOT NULL DEFAULT 'none',
  cancelled_at      TEXT,
  cancelled_by      TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at      TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id                  TEXT PRIMARY KEY,
  order_id            TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id            TEXT NOT NULL REFERENCES users(id),
  plant_id            TEXT NOT NULL REFERENCES plants(id),
  rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             TEXT,
  is_verified_purchase INTEGER NOT NULL DEFAULT 0,
  seller_reply        TEXT,
  seller_replied_at   TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  plant_id         TEXT REFERENCES plants(id),
  identified_name  TEXT,
  confidence_pct   REAL,
  health_score     INTEGER CHECK (health_score BETWEEN 0 AND 100),
  is_toxic         INTEGER NOT NULL DEFAULT 0,
  raw_api_response TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  otp_hash   TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wishlists (
  id         TEXT PRIMARY KEY,
  buyer_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id   TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (buyer_id, plant_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  link       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coupons (
  id                TEXT PRIMARY KEY,
  code              TEXT UNIQUE NOT NULL,
  type              TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','fixed')),
  value             REAL NOT NULL,
  min_order_pkr     REAL NOT NULL DEFAULT 0,
  max_discount_pkr  REAL,
  starts_at         TEXT,
  expires_at        TEXT,
  usage_limit       INTEGER,
  used_count        INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_by        TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS my_garden (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id             TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  nickname             TEXT,
  water_reminder_days  INTEGER DEFAULT 7,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, plant_id)
);

-- plants_fts: standalone FTS5 index for fast plant search.
-- plants.id is a TEXT primary key, so we cannot use an external-content
-- FTS table (which requires an INTEGER rowid). Instead we mirror the
-- searchable text and keep it in sync with triggers.
CREATE VIRTUAL TABLE IF NOT EXISTS plants_fts USING fts5(
  plant_id UNINDEXED,
  name,
  scientific_name,
  description,
  category
);

CREATE TRIGGER IF NOT EXISTS plants_fts_ai AFTER INSERT ON plants BEGIN
  INSERT INTO plants_fts (plant_id, name, scientific_name, description, category)
  VALUES (new.id, new.name, IFNULL(new.scientific_name,''), IFNULL(new.description,''), IFNULL(new.category,''));
END;

CREATE TRIGGER IF NOT EXISTS plants_fts_ad AFTER DELETE ON plants BEGIN
  DELETE FROM plants_fts WHERE plant_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS plants_fts_au AFTER UPDATE ON plants BEGIN
  DELETE FROM plants_fts WHERE plant_id = old.id;
  INSERT INTO plants_fts (plant_id, name, scientific_name, description, category)
  VALUES (new.id, new.name, IFNULL(new.scientific_name,''), IFNULL(new.description,''), IFNULL(new.category,''));
END;

CREATE INDEX IF NOT EXISTS idx_plants_seller ON plants(seller_id);
CREATE INDEX IF NOT EXISTS idx_plants_city   ON plants(city);
CREATE INDEX IF NOT EXISTS idx_plants_cat    ON plants(category);
CREATE INDEX IF NOT EXISTS idx_orders_buyer  ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider  ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_user ON scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_buyer ON wishlists(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_plant ON wishlists(plant_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_reviews_plant ON reviews(plant_id);
CREATE INDEX IF NOT EXISTS idx_garden_user ON my_garden(user_id);
`);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Generate a UUID v4 string (matches Supabase/Postgres uuid type). */
const uuid = () => crypto.randomUUID();

/** Run a query and return all rows (throws on SQL error). */
const query = (sql, params = []) => db.prepare(sql).all(...params);

/** Run a query and return a single row or undefined. */
const get = (sql, params = []) => db.prepare(sql).get(...params);

/** Run an INSERT/UPDATE/DELETE; returns { changes, lastID }. */
const run = (sql, params = []) => {
  const info = db.prepare(sql).run(...params);
  return { changes: info.changes, lastID: info.lastInsertRowid };
};

/** Run statements inside a transaction (all-or-nothing). */
const transaction = (fn) => db.transaction(fn);

// ------------------------------------------------------------------
// Seed data — only when the users table is empty
// ------------------------------------------------------------------
function seed() {
  const count = get('SELECT COUNT(*) AS c FROM users').c;
  if (count > 0) return;

  const bcrypt = require('bcryptjs');
  const now = () => new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);

  const buyer  = { id: uuid(), full_name: 'Shehroz Ahmed',  email: 'shehroz@test.com',  phone: '03001111111', role: 'buyer',  city: 'Lahore' };
  const seller = { id: uuid(), full_name: 'Zainab Nursery', email: 'zainab@test.com',   phone: '03002222222', role: 'seller', city: 'Lahore' };
  const rider  = { id: uuid(), full_name: 'Bilal Rider',    email: 'bilal@test.com',    phone: '03003333333', role: 'rider',  city: 'Lahore' };
  const admin  = { id: uuid(), full_name: 'Plantea Admin',  email: 'admin@plantea.com', phone: '03009999999', role: 'admin',  city: 'Lahore' };

  const users = [
    { ...buyer,  password_hash: bcrypt.hashSync('Test1234', salt) },
    { ...seller, password_hash: bcrypt.hashSync('Test1234', salt) },
    { ...rider,  password_hash: bcrypt.hashSync('Test1234', salt) },
    { ...admin,  password_hash: bcrypt.hashSync('Test1234', salt) },
  ];

  const insertUser = db.prepare(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role, city) VALUES (?,?,?,?,?,?,?)`
  );
  const insertPlant = db.prepare(
    `INSERT INTO plants (id, seller_id, name, scientific_name, description, price_pkr, stock_quantity, category, city, ai_verified, health_score, image_url, featured, is_organic, care_level)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );

  db.transaction(() => {
    for (const u of users) insertUser.run(u.id, u.full_name, u.email, u.phone, u.password_hash, u.role, u.city);

    const plants = [
      // name, scientific_name, description, price, stock, category, city, ai_verified, health, image_url, featured, organic, care
      ['Peace Lily',       'Spathiphyllum wallisii',        'Low-maintenance indoor plant. Purifies air. Great for beginners.', 850,  8,  'Indoor',    'Lahore',    1, 92, '/uploads/planta_img_peacelily.jpg', 1, 0, 'Easy'],
      ['Snake Plant',      'Dracaena trifasciata',          'Extremely hardy. Tolerates low light and irregular watering.',        1200, 6,  'Indoor',    'Karachi',   1, 95, '/uploads/planta_img_snakeplant.jpg', 1, 1, 'Easy'],
      ['Aloe Vera',        'Aloe barbadensis miller',       'Succulent with soothing gel. Easy to grow in bright light.',          600,  10, 'Medicinal', 'Lahore',    1, 88, '/uploads/planta_img_aloevera.jpg', 0, 1, 'Easy'],
      ['Rose Plant',       'Rosa indica',                   'Classic fragrant rose. Best in full sun with regular feeding.',        1500, 4,  'Flowering', 'Islamabad', 1, 85, '/uploads/planta_img_rose.jpg', 0, 0, 'Moderate'],
      ['Monstera',         'Monstera deliciosa',            'Iconic split-leaf plant. Thrives in bright, indirect light.',         2500, 3,  'Indoor',    'Lahore',    1, 90, '/uploads/planta_img_monstera.jpg', 1, 0, 'Moderate'],
      ['Bamboo Palm',      'Chamaedorea seifrizii',         'Air-purifying palm that loves bright, filtered light.',               1800, 5,  'Outdoor',   'Karachi',   1, 87, '/uploads/planta_img_bamboopalm.jpg', 0, 1, 'Easy'],
      ['Basil (Tulsi)',    'Ocimum tenuiflorum',            'Sacred herb used for tea and remedies. Loves sunlight.',              350,  15, 'Medicinal', 'Lahore',    1, 90, '/uploads/planta_img_basil.jpg', 0, 1, 'Easy'],
      ['Jasmine',          'Jasminum sambac',               'Fragrant white flowers. Needs full sun and regular water.',           900,  7,  'Flowering', 'Faisalabad', 1, 84, '/uploads/planta_img_jasmine.jpg', 0, 0, 'Moderate'],
      ['Pothos',           'Epipremnum aureum',             'Fast-growing vining plant. Perfect for hanging baskets.',             700,  12, 'Indoor',    'Lahore',    1, 93, '/uploads/planta_img_pothos.jpg', 0, 0, 'Easy'],
      ['Mango Tree',       'Mangifera indica',              'Fruit tree for home gardens. Requires sunny space.',                  3200, 2,  'Outdoor',   'Multan',    1, 82, '/uploads/planta_img_mango.jpg', 1, 1, 'Advanced'],
      ['Fiddle Leaf Fig',  'Ficus lyrata',                  'Statement indoor plant with large glossy leaves.',                    2800, 3,  'Indoor',    'Islamabad', 1, 86, '/uploads/planta_img_fiddleleaf.jpg', 0, 0, 'Moderate'],
      ['Marigold',         'Tagetes erecta',                'Cheerful annual flower, great for borders and pots.',                 250,  20, 'Flowering', 'Lahore',    1, 89, '/uploads/planta_img_marigold.jpg', 0, 1, 'Easy'],
    ];

    plants.forEach(p => {
      insertPlant.run(
        uuid(), seller.id, p[0], p[1], p[2], p[3], p[4], p[5], p[6],
        p[7], p[8], p[9], p[10], p[11], p[12]
      );
    });

    logger.info(`Seeded ${users.length} users and ${plants.length} plants into SQLite`);
  })();
}

seed();

// Apply incremental schema migrations (admin role, promotions, reviews,
// coupons, my_garden, FTS search, etc.) to existing databases.
const { runMigrations } = require('./migrations');
runMigrations(db);

/** Gracefully close the database (used during shutdown). */
const closeDb = () => {
  try {
    db.close();
    logger.info('SQLite database closed.');
  } catch (e) {
    logger.warn('Error closing database:', e.message);
  }
};

module.exports = { db, uuid, query, get, run, transaction, closeDb };
