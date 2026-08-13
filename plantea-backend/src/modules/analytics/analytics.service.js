// =============================================================
// src/modules/analytics/analytics.service.js
// Plantea — Seller & Admin Analytics Business Logic
// =============================================================
// Responsibility: Aggregate order/plant/revenue metrics for dashboards.
//   Real numbers from real data — no fabricated stats.
// =============================================================

const { query, get } = require('../../config/db');
const { roundMoney } = require('../../utils/money');

/** Recent N days as 'YYYY-MM-DD' (inclusive), oldest first. */
const recentDays = (n = 14) => {
  const days = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

/** Group order rows by the day their created_at falls on. */
const groupByDay = (rows, days) => {
  const map = Object.fromEntries(days.map(d => [d, 0]));
  for (const r of rows) {
    const day = String(r.day || '').slice(0, 10);
    if (map[day] !== undefined) map[day] += Number(r.total_pkr || 0);
  }
  return days.map(d => ({ date: d, revenue: roundMoney(map[d]) }));
};

/**
 * Seller dashboard analytics.
 * @param {string} sellerId
 */
const getSellerAnalytics = async (sellerId) => {
  const days = recentDays(14);

  const totals = get(
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_pkr ELSE 0 END), 0) AS revenue
     FROM orders o
     JOIN plants p ON p.id = o.plant_id
     WHERE p.seller_id = ?`,
    [sellerId]
  ) || { total_orders: 0, revenue: 0 };

  const statusCounts = query(
    `SELECT o.status, COUNT(*) AS count
     FROM orders o JOIN plants p ON p.id = o.plant_id
     WHERE p.seller_id = ?
     GROUP BY o.status`,
    [sellerId]
  );

  const revenueByDay = query(
    `SELECT substr(o.created_at, 1, 10) AS day, o.total_pkr
     FROM orders o JOIN plants p ON p.id = o.plant_id
     WHERE p.seller_id = ? AND o.status = 'delivered'
       AND o.created_at >= date('now', '-13 days')`,
    [sellerId]
  );

  const topPlants = query(
    `SELECT p.id, p.name, p.image_url, p.price_pkr, p.stock_quantity,
            p.views_count, p.sold_count,
            (SELECT COUNT(*) FROM reviews r WHERE r.plant_id = p.id) AS review_count,
            (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.plant_id = p.id) AS rating_avg
     FROM plants p
     WHERE p.seller_id = ?
     ORDER BY p.sold_count DESC, p.views_count DESC
     LIMIT 5`,
    [sellerId]
  );

  const plantSummary = get(
    `SELECT COUNT(*) AS total_listings,
            COALESCE(SUM(is_available = 1), 0) AS active_listings,
            COALESCE(SUM(stock_quantity), 0) AS total_stock,
            COALESCE(SUM(views_count), 0) AS total_views
     FROM plants WHERE seller_id = ?`,
    [sellerId]
  ) || { total_listings: 0, active_listings: 0, total_stock: 0, total_views: 0 };

  return {
    totals: {
      total_orders: totals.total_orders,
      revenue: roundMoney(totals.revenue),
      statusCounts,
    },
    revenue_chart: groupByDay(revenueByDay, days),
    top_plants: topPlants,
    plant_summary: plantSummary,
  };
};

/**
 * Admin platform analytics.
 */
const getAdminAnalytics = async () => {
  const days = recentDays(14);

  const counts = get(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM users WHERE role = 'buyer') AS buyers,
       (SELECT COUNT(*) FROM users WHERE role = 'seller') AS sellers,
       (SELECT COUNT(*) FROM users WHERE role = 'rider') AS riders,
       (SELECT COUNT(*) FROM plants) AS total_plants,
       (SELECT COUNT(*) FROM plants WHERE is_available = 1) AS active_plants,
       (SELECT COUNT(*) FROM orders) AS total_orders,
       (SELECT COUNT(*) FROM orders WHERE status = 'delivered') AS delivered_orders,
       (SELECT COUNT(*) FROM reviews) AS total_reviews,
       (SELECT COUNT(*) FROM coupons) AS total_coupons`
  ) || {};

  const revenueByDay = query(
    `SELECT substr(created_at, 1, 10) AS day, total_pkr
     FROM orders WHERE status = 'delivered'
       AND created_at >= date('now', '-13 days')`
  );

  const revenue = get(
    `SELECT COALESCE(SUM(total_pkr), 0) AS total FROM orders WHERE status = 'delivered'`
  ) || { total: 0 };

  const statusCounts = query(
    `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
  );

  const topSellers = query(
    `SELECT u.id, u.full_name, u.is_verified,
            COUNT(o.id) AS order_count,
            COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_pkr ELSE 0 END), 0) AS revenue
     FROM users u
     JOIN plants p ON p.seller_id = u.id
     LEFT JOIN orders o ON o.plant_id = p.id
     WHERE u.role = 'seller'
     GROUP BY u.id
     ORDER BY revenue DESC
     LIMIT 5`
  );

  return {
    counts,
    revenue: roundMoney(revenue.total),
    revenue_chart: groupByDay(revenueByDay, days),
    status_counts: statusCounts,
    top_sellers: topSellers,
  };
};

module.exports = { getSellerAnalytics, getAdminAnalytics };
