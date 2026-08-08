-- =============================================================
-- PLANTEA — Pakistan's Smart Plant Marketplace
-- Database Schema  |  PostgreSQL via Supabase
-- Team: CS 3rd Semester, UET Lahore  |  IDEAL Labs
-- Dr. Syed Khaldoon Khurshid
-- =============================================================
-- Design Principles Applied:
--   • 3NF Normalization  — no repeated data, no update anomalies
--   • Referential Integrity — all foreign keys declared explicitly
--   • Role-Based Structure — one users table, role column separates behavior
--   • Audit Timestamps — every table has created_at for traceability
-- =============================================================


-- -------------------------------------------------------------
-- ENUM TYPES  (restricts bad data at the DB level)
-- -------------------------------------------------------------

-- Three roles in the Plantea ecosystem
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'rider');

-- Lifecycle of a plant order
CREATE TYPE order_status AS ENUM (
  'pending',      -- order placed, waiting for seller confirmation
  'confirmed',    -- seller accepted the order
  'picked_up',    -- rider picked up the plant
  'in_transit',   -- rider on the way to buyer
  'delivered',    -- order completed
  'cancelled'     -- cancelled by buyer or seller
);

-- Seller subscription tier (determines commission rate)
CREATE TYPE subscription_tier AS ENUM ('free', 'starter');


-- -------------------------------------------------------------
-- TABLE 1: users
-- Stores all three roles (buyer, seller, rider) in one table.
-- Role column controls which features each user can access.
-- Normalization: name, phone, city stored once — never duplicated.
-- -------------------------------------------------------------
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  UNIQUE NOT NULL,
  phone         VARCHAR(20)   UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,              -- bcrypt hashed password
  role          user_role     NOT NULL,              -- 'buyer' | 'seller' | 'rider'
  city          VARCHAR(60)   NOT NULL DEFAULT 'Lahore',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE, -- soft disable without deleting
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index speeds up login queries (email looked up on every login)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);


-- -------------------------------------------------------------
-- TABLE 2: plants
-- Each plant listing belongs to exactly one seller.
-- seller_id is a foreign key — never store seller name here (3NF).
-- ai_verified flag = true only after Plant.id API confirms health.
-- -------------------------------------------------------------
CREATE TABLE plants (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(150)  NOT NULL,               -- common name e.g. "Peace Lily"
  scientific_name VARCHAR(150),                         -- e.g. "Spathiphyllum wallisii"
  description     TEXT,
  price_pkr       NUMERIC(10,2) NOT NULL CHECK (price_pkr > 0),
  stock_quantity  INT           NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
  category        VARCHAR(60),                          -- e.g. "Indoor", "Outdoor"
  city            VARCHAR(60)   NOT NULL DEFAULT 'Lahore',
  ai_verified     BOOLEAN       NOT NULL DEFAULT FALSE, -- set TRUE after scanner approval
  health_score    SMALLINT      CHECK (health_score BETWEEN 0 AND 100),
  image_url       TEXT,
  is_available    BOOLEAN       NOT NULL DEFAULT TRUE,  -- seller can hide without deleting
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Buyers browse by city and category most frequently
CREATE INDEX idx_plants_seller   ON plants(seller_id);
CREATE INDEX idx_plants_city     ON plants(city);
CREATE INDEX idx_plants_category ON plants(category);


-- -------------------------------------------------------------
-- TABLE 3: orders
-- Links buyer → plant → rider in one record.
-- commission_pkr calculated at order time (never recalculated later).
-- Normalization: buyer address stored here, not copied into users.
-- -------------------------------------------------------------
CREATE TABLE orders (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id          UUID          NOT NULL REFERENCES users(id),
  plant_id          UUID          NOT NULL REFERENCES plants(id),
  rider_id          UUID          REFERENCES users(id),       -- assigned after confirmation
  status            order_status  NOT NULL DEFAULT 'pending',
  quantity          INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_order    NUMERIC(10,2) NOT NULL,                   -- locked price (price may change later)
  delivery_fee_pkr  NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  commission_pkr    NUMERIC(10,2) NOT NULL,                   -- 5–10% of price_at_order
  total_pkr         NUMERIC(10,2) NOT NULL,                   -- price + delivery fee
  delivery_address  TEXT          NOT NULL,
  payment_method    VARCHAR(30)   NOT NULL DEFAULT 'COD',     -- 'COD' | 'EasyPaisa' | 'JazzCash'
  notes             TEXT,                                     -- buyer's special instructions
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ                               -- set when status = 'delivered'
);

CREATE INDEX idx_orders_buyer  ON orders(buyer_id);
CREATE INDEX idx_orders_rider  ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);


-- -------------------------------------------------------------
-- TABLE 4: subscriptions
-- Tracks which sellers are on the paid Starter plan (Rs. 999/mo).
-- Commission is looked up from here when an order is created.
-- Normalization: plan details live here — never copied into orders.
-- -------------------------------------------------------------
CREATE TABLE subscriptions (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier            subscription_tier NOT NULL DEFAULT 'free',
  commission_rate NUMERIC(4,2)    NOT NULL DEFAULT 10.00,  -- percentage e.g. 10.00 = 10%
  start_date      DATE            NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,                                    -- NULL = active indefinitely
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- A seller can only have ONE active subscription at a time
  UNIQUE (seller_id, is_active)
);


-- -------------------------------------------------------------
-- TABLE 5: reviews
-- Buyer leaves a review for a plant after delivery.
-- One review per buyer per order (prevents duplicate reviews).
-- -------------------------------------------------------------
CREATE TABLE reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id    UUID        NOT NULL REFERENCES users(id),
  plant_id    UUID        NOT NULL REFERENCES plants(id),
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A buyer can only review the same order once
  UNIQUE (order_id, buyer_id)
);

CREATE INDEX idx_reviews_plant ON reviews(plant_id);


-- -------------------------------------------------------------
-- TABLE 6: scan_logs
-- Every AI scanner usage is recorded for analytics and trust audits.
-- Separated from plants table — a scan may happen before a listing.
-- -------------------------------------------------------------
CREATE TABLE scan_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id),
  plant_id        UUID        REFERENCES plants(id),           -- linked if listing was created
  identified_name VARCHAR(150),                                -- what Plant.id returned
  confidence_pct  NUMERIC(5,2),                               -- e.g. 94.50
  health_score    SMALLINT    CHECK (health_score BETWEEN 0 AND 100),
  is_toxic        BOOLEAN     DEFAULT FALSE,
  raw_api_response JSONB,                                      -- full Plant.id JSON stored for debugging
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_logs_user ON scan_logs(user_id);


-- =============================================================
-- SEED DATA — Development / Testing Only
-- =============================================================

-- Insert test users (password hashing handled by Supabase Auth)
INSERT INTO users (id, full_name, email, phone, role, city) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Shehroz Ahmed',  'shehroz@test.com',  '03001111111', 'buyer',  'Lahore'),
  ('22222222-0000-0000-0000-000000000002', 'Zainab Nursery', 'zainab@test.com',   '03002222222', 'seller', 'Lahore'),
  ('33333333-0000-0000-0000-000000000003', 'Bilal Rider',    'bilal@test.com',    '03003333333', 'rider',  'Lahore');

-- Default free subscription for test seller
INSERT INTO subscriptions (seller_id, tier, commission_rate) VALUES
  ('22222222-0000-0000-0000-000000000002', 'free', 10.00);

-- Test plant listing
INSERT INTO plants (seller_id, name, scientific_name, description, price_pkr, stock_quantity, category, ai_verified, health_score) VALUES
  ('22222222-0000-0000-0000-000000000002',
   'Peace Lily', 'Spathiphyllum wallisii',
   'Low-maintenance indoor plant. Purifies air. Great for beginners.',
   850.00, 5, 'Indoor', TRUE, 92);
