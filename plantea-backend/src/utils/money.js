// =============================================================
// src/utils/money.js
// Plantea — Money Math Helpers
// =============================================================
// Responsibility: Single, consistent way to compute money values.
//
// The platform quotes prices in Pakistani Rupees. Prices are stored as
// REAL rupee values, but all derived amounts (totals, discounts) must be
// rounded deterministically to avoid floating-point drift (0.1 + 0.2).
// =============================================================

/** Round a money value to the nearest rupee (2-decimal safe). */
const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/**
 * Compute a percentage discount.
 * @param {number} amount      - original amount in PKR
 * @param {number} percent     - discount percent (0-100)
 * @param {number} [maxAmount] - optional cap on the discount amount
 * @returns {number} discounted amount (not the discount itself)
 */
const applyPercentDiscount = (amount, percent, maxAmount) => {
  let discount = roundMoney(Number(amount) * (Number(percent) / 100));
  if (maxAmount != null) discount = Math.min(discount, Number(maxAmount));
  return roundMoney(Number(amount) - discount);
};

/** Format a number as PKR for display (client-side friendly string). */
const formatPkr = (value) => `Rs. ${roundMoney(value).toLocaleString('en-PK')}`;

module.exports = { roundMoney, applyPercentDiscount, formatPkr };
