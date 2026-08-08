-- =============================================================
-- 003_wishlist_notifications.sql
-- Plantea — Wishlist and Notifications Tables
-- =============================================================
-- Purpose: Add wishlist and notifications functionality
-- Run this in Supabase SQL Editor after previous migrations
-- =============================================================

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, plant_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_buyer ON wishlists(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_plant ON wishlists(plant_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);

-- Add comments
COMMENT ON TABLE wishlists IS 'Stores buyer wishlist items (saved plants)';
COMMENT ON TABLE notifications IS 'Stores user notifications for orders and system events';
