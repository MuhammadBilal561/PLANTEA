// =============================================================
// src/config/migrations.js
// Plantea — Incremental Schema Migrations
// =============================================================
// The base schema in db.js uses CREATE TABLE IF NOT EXISTS (idempotent
// for new databases). This file applies incremental, versioned migrations
// to EXISTING databases so the schema can evolve safely over time.
//
// Each migration runs inside a transaction and is recorded in
// schema_migrations so it never runs twice.
// =============================================================

const logger = require('../utils/logger');

/** PRAGMA table_info returns { name } for each column. */
const hasColumn = (db, table, column) => {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
};

/** SQLite has no ALTER COLUMN / CHECK-constraint change: rebuild the
 *  users table with the admin role and the new profile columns. */
const rebuildUsersWithAdminRole = (db) => {
  const FK_OFF = 'PRAGMA foreign_keys = OFF';
  const FK_ON = 'PRAGMA foreign_keys = ON';
  db.exec(FK_OFF);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_v2 (
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
    INSERT OR REPLACE INTO users_v2 (id, full_name, email, phone, password_hash, role, city, is_active, created_at)
      SELECT id, full_name, email, phone, password_hash, role, city, is_active, created_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_v2 RENAME TO users;
  `);
  db.exec(FK_ON);
  logger.info('Migration: users table rebuilt with admin role + profile columns');
};

const migrations = [
  {
    id: 1,
    name: 'admin role + user profile fields',
    up(db) {
      if (hasColumn(db, 'users', 'is_verified')) return; // already applied
      rebuildUsersWithAdminRole(db);
    },
  },
  {
    id: 2,
    name: 'plants commerce/analytics columns',
    up(db) {
      if (!hasColumn(db, 'plants', 'featured')) {
        db.exec(`ALTER TABLE plants ADD COLUMN featured INTEGER NOT NULL DEFAULT 0`);
      }
      if (!hasColumn(db, 'plants', 'discount_pct')) {
        db.exec(`ALTER TABLE plants ADD COLUMN discount_pct REAL NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 90)`);
      }
      if (!hasColumn(db, 'plants', 'original_price_pkr')) {
        db.exec(`ALTER TABLE plants ADD COLUMN original_price_pkr REAL`);
      }
      if (!hasColumn(db, 'plants', 'views_count')) {
        db.exec(`ALTER TABLE plants ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0`);
      }
      if (!hasColumn(db, 'plants', 'sold_count')) {
        db.exec(`ALTER TABLE plants ADD COLUMN sold_count INTEGER NOT NULL DEFAULT 0`);
      }
      if (!hasColumn(db, 'plants', 'care_level')) {
        db.exec(`ALTER TABLE plants ADD COLUMN care_level TEXT DEFAULT 'Easy'`);
      }
      if (!hasColumn(db, 'plants', 'is_organic')) {
        db.exec(`ALTER TABLE plants ADD COLUMN is_organic INTEGER NOT NULL DEFAULT 0`);
      }
      db.exec(`CREATE INDEX IF NOT EXISTS idx_plants_created ON plants(created_at)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_plants_featured ON plants(featured)`);
    },
  },
  {
    id: 3,
    name: 'orders promo/refund columns',
    up(db) {
      if (!hasColumn(db, 'orders', 'coupon_code')) {
        db.exec(`ALTER TABLE orders ADD COLUMN coupon_code TEXT`);
      }
      if (!hasColumn(db, 'orders', 'discount_pkr')) {
        db.exec(`ALTER TABLE orders ADD COLUMN discount_pkr REAL NOT NULL DEFAULT 0`);
      }
      if (!hasColumn(db, 'orders', 'refund_status')) {
        db.exec(`ALTER TABLE orders ADD COLUMN refund_status TEXT NOT NULL DEFAULT 'none'`);
      }
      if (!hasColumn(db, 'orders', 'cancelled_at')) {
        db.exec(`ALTER TABLE orders ADD COLUMN cancelled_at TEXT`);
      }
      if (!hasColumn(db, 'orders', 'cancelled_by')) {
        db.exec(`ALTER TABLE orders ADD COLUMN cancelled_by TEXT`);
      }
    },
  },
  {
    id: 4,
    name: 'reviews verified-purchase + seller reply',
    up(db) {
      if (!hasColumn(db, 'reviews', 'is_verified_purchase')) {
        db.exec(`ALTER TABLE reviews ADD COLUMN is_verified_purchase INTEGER NOT NULL DEFAULT 0`);
      }
      if (!hasColumn(db, 'reviews', 'seller_reply')) {
        db.exec(`ALTER TABLE reviews ADD COLUMN seller_reply TEXT`);
      }
      if (!hasColumn(db, 'reviews', 'seller_replied_at')) {
        db.exec(`ALTER TABLE reviews ADD COLUMN seller_replied_at TEXT`);
      }
      db.exec(`CREATE INDEX IF NOT EXISTS idx_reviews_plant ON reviews(plant_id)`);
    },
  },
  {
    id: 5,
    name: 'notifications deep-link + read index',
    up(db) {
      if (!hasColumn(db, 'notifications', 'link')) {
        db.exec(`ALTER TABLE notifications ADD COLUMN link TEXT`);
      }
      db.exec(`CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_wishlist_plant ON wishlists(plant_id)`);
    },
  },
  {
    id: 6,
    name: 'coupons table',
    up(db) {
      db.exec(`
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
        )
      `);
    },
  },
  {
    id: 7,
    name: 'my garden table',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS my_garden (
          id                   TEXT PRIMARY KEY,
          user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          plant_id             TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
          nickname             TEXT,
          water_reminder_days  INTEGER DEFAULT 7,
          created_at           TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (user_id, plant_id)
        )
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_garden_user ON my_garden(user_id)`);
    },
  },
  {
    id: 8,
    name: 'plants FTS search index',
    up(db) {
      // Standalone FTS5 index (see db.js — plants.id is TEXT so external-content
      // tables are not usable). Drop/recreate is idempotent and rebuilds the
      // index from current rows for databases that predate the index.
      db.exec('DROP TABLE IF EXISTS plants_fts');
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS plants_fts USING fts5(
          plant_id UNINDEXED,
          name,
          scientific_name,
          description,
          category
        )
      `);
      db.exec(`
        INSERT INTO plants_fts (plant_id, name, scientific_name, description, category)
        SELECT id, name, IFNULL(scientific_name,''), IFNULL(description,''), IFNULL(category,'')
        FROM plants
      `);
      // Ensure sync triggers exist (they are created in db.js base schema for
      // fresh installs; re-run here is a no-op thanks to IF NOT EXISTS).
      db.exec(`
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
      `);
    },
  },
  {
    id: 9,
    name: 'seed demo plant images',
    up(db) {
      // Backfill image_url for the demo/seed plants so existing databases
      // (created before images existed) show photos. Safe to run once:
      // only matches the exact seed plant names.
      const images = [
        ['Peace Lily',      '/uploads/planta_img_peacelily.jpg'],
        ['Snake Plant',     '/uploads/planta_img_snakeplant.jpg'],
        ['Aloe Vera',       '/uploads/planta_img_aloevera.jpg'],
        ['Rose Plant',      '/uploads/planta_img_rose.jpg'],
        ['Monstera',        '/uploads/planta_img_monstera.jpg'],
        ['Bamboo Palm',     '/uploads/planta_img_bamboopalm.jpg'],
        ['Basil (Tulsi)',   '/uploads/planta_img_basil.jpg'],
        ['Jasmine',         '/uploads/planta_img_jasmine.jpg'],
        ['Pothos',          '/uploads/planta_img_pothos.jpg'],
        ['Mango Tree',      '/uploads/planta_img_mango.jpg'],
        ['Fiddle Leaf Fig', '/uploads/planta_img_fiddleleaf.jpg'],
        ['Marigold',        '/uploads/planta_img_marigold.jpg'],
      ];
      const upd = db.prepare(
        "UPDATE plants SET image_url = ? WHERE name = ? AND (image_url IS NULL OR image_url = '')"
      );
      for (const [name, url] of images) upd.run(url, name);
      logger.info(`Migration 9: backfilled image_url for ${images.length} demo plants`);
    },
  },
];

/**
 * Apply all pending migrations to the given database.
 * @param {import('better-sqlite3').Database} db
 */
const runMigrations = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT id FROM schema_migrations').all().map(r => r.id)
  );

  // Foreign key enforcement cannot be toggled *inside* a transaction, and
  // some migrations rebuild parent tables (DROP + RENAME). With FK ON, such
  // a DROP would cascade-delete child rows (plants, orders, ...). So we
  // disable FK enforcement around the whole migration batch, then re-enable
  // and validate afterwards.
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      logger.info(`Applying migration ${migration.id}: ${migration.name}`);
      const run = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
      });
      run();
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
    const violations = db.prepare('PRAGMA foreign_key_check').all();
    if (violations.length > 0) {
      logger.warn(`foreign_key_check found ${violations.length} violations after migrations`);
    }
  }
};

module.exports = { runMigrations };
