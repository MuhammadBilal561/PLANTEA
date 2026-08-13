// =============================================================
// src/modules/payment/payment.controller.js
// Plantea — Payment Integration
// =============================================================
// Responsibility: Provide payment method metadata and an optional
//   JazzCash initiation endpoint.
//
// The platform is FREE and COD-first: placing an order never
//   requires online payment. JazzCash/EasyPaisa are available as
//   offline options for sellers who choose to use them.
// =============================================================

const crypto = require('crypto');
const { get, run } = require('../../config/db');
const createNotification = require('../../utils/createNotification');
const ApiResponse = require('../../utils/ApiResponse');
const logger = require('../../utils/logger');

/**
 * GET /api/payments/methods
 * Return the payment methods available in-app.
 */
const getPaymentMethods = async (req, res) => {
  return ApiResponse.success(res, {
    methods: [
      { id: 'COD', label: 'Cash on Delivery', description: 'Pay the rider or seller in cash when your order arrives.', icon: '💵' },
      { id: 'EasyPaisa', label: 'EasyPaisa / JazzCash', description: 'Transfer payment to the seller\u2019s account on delivery confirmation.', icon: '📱' },
    ],
    free_platform: true,
    commission_note: 'Plantea charges 0% commission — sellers keep 100% of every sale.',
  }, 'Payment methods retrieved.');
};


/**
 * Build the pp_SecureHash exactly as JazzCash expects:
 * sha256(integritySalt & <sorted "k=v" pairs joined by "&">)
 */
const buildSecureHash = (params) => {
  const sortedKeys = Object.keys(params).sort();
  const hashString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT || '';
  return crypto
    .createHash('sha256')
    .update(integritySalt + '&' + hashString)
    .digest('hex')
    .toUpperCase();
};

/**
 * POST /api/payments/jazzcash/initiate
 * Generate a JazzCash payment form for an order.
 * Only the order's buyer may initiate, the amount must match the order
 * total, and the order must still be pending.
 */
const initiateJazzCashPayment = async (req, res, next) => {
  try {
    const { order_id, amount_pkr, phone_number } = req.body;

    if (!order_id || !amount_pkr || !phone_number) {
      return ApiResponse.error(res, 'order_id, amount_pkr, and phone_number are required', 400);
    }

    if (!/^03[0-9]{9}$/.test(phone_number)) {
      return ApiResponse.error(res, 'Phone must be a valid Pakistani number (03XXXXXXXXX)', 400);
    }

    if (amount_pkr <= 0) {
      return ApiResponse.error(res, 'Amount must be greater than 0', 400);
    }

    // Validate the order: exists, belongs to the caller, pending, amount matches
    const order = get('SELECT id, buyer_id, status, total_pkr FROM orders WHERE id = ?', [order_id]);
    if (!order) {
      return ApiResponse.error(res, 'Order not found.', 404);
    }
    if (order.buyer_id !== req.user.id) {
      return ApiResponse.error(res, 'You can only pay for your own orders.', 403);
    }
    if (order.status !== 'pending') {
      return ApiResponse.error(res, 'Payment can only be initiated for pending orders.', 400);
    }
    if (Math.abs(Number(amount_pkr) - order.total_pkr) > 0.01) {
      return ApiResponse.error(res, `Amount does not match the order total (${order.total_pkr} PKR).`, 400);
    }

    // JazzCash not configured → the app still works via COD.
    if (!process.env.JAZZCASH_MERCHANT_ID || !process.env.JAZZCASH_PASSWORD || !process.env.JAZZCASH_INTEGRITY_SALT) {
      return ApiResponse.success(res, {
        mode: 'cod',
        message: 'JazzCash is not configured. This order will be handled as Cash on Delivery.',
      }, 'Payment method fallback to COD.');
    }

    const txnDateTime = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const txnRefNo = 'T' + txnDateTime + Math.floor(Math.random() * 1000);
    const amountPaisas = String(Math.round(amount_pkr * 100));
    const expiryDate = new Date(Date.now() + 30 * 60 * 1000);
    const txnExpiryDateTime = expiryDate.toISOString().replace(/[^0-9]/g, '').slice(0, 14);

    const params = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID || '',
      pp_SubMerchantID: '',
      pp_Password: process.env.JAZZCASH_PASSWORD || '',
      pp_BankID: 'TBANK',
      pp_ProductID: 'RETL',
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amountPaisas,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: 'plantea-' + order.id.slice(0, 12),
      pp_Description: 'Plantea Plant Order',
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ReturnURL: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/payments/jazzcash/callback`,
      pp_MobileNumber: phone_number,
      ppmpf_1: '',
      ppmpf_2: '',
      ppmpf_3: '',
      ppmpf_4: '',
      ppmpf_5: '',
    };

    params.pp_SecureHash = buildSecureHash(params);

    logger.info(`JazzCash payment initiated for order ${order.id}: ${txnRefNo}`);

    return ApiResponse.success(res, {
      form_url: process.env.JAZZCASH_SANDBOX_URL || 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
      form_data: params,
      txn_ref_no: txnRefNo,
    }, 'Payment form generated successfully');

  } catch (err) {
    next(err);
  }
};


/**
 * POST /api/payments/jazzcash/callback
 * Handle JazzCash payment callback (webhook).
 * The pp_SecureHash is verified before any order is updated. When JazzCash
 * is not configured, callbacks are rejected outright (prevents forgeries).
 */
const handleJazzCashCallback = async (req, res) => {
  try {
    const body = req.body || {};
    const { pp_ResponseCode, pp_TxnRefNo, pp_BillReference, pp_ResponseMessage, pp_SecureHash } = body;

    logger.info(`JazzCash callback received: ${pp_TxnRefNo} - Response: ${pp_ResponseCode}`);

    // Reject everything unless JazzCash is actually configured
    if (!process.env.JAZZCASH_MERCHANT_ID || !process.env.JAZZCASH_PASSWORD || !process.env.JAZZCASH_INTEGRITY_SALT) {
      logger.warn('JazzCash callback rejected — gateway not configured');
      return res.status(200).json({ success: false, message: 'JazzCash is not configured' });
    }

    // Signature verification (prevents forged "successful" callbacks)
    const { pp_SecureHash: _ignored, ...paramsToVerify } = body;
    const expectedHash = buildSecureHash(paramsToVerify);
    if (!pp_SecureHash || pp_SecureHash.toUpperCase() !== expectedHash) {
      logger.warn(`JazzCash callback signature mismatch for ${pp_TxnRefNo}`);
      return res.status(200).json({ success: false, message: 'Invalid signature' });
    }

    if (pp_ResponseCode === '000') {
      logger.info(`JazzCash payment successful: ${pp_TxnRefNo}`);

      if (pp_BillReference && pp_BillReference.startsWith('plantea-')) {
        const orderIdPrefix = pp_BillReference.replace('plantea-', '');

        const order = get('SELECT * FROM orders WHERE id LIKE ? LIMIT 1', [`${orderIdPrefix}%`]);

        if (order) {
          if (order.status !== 'pending') {
            logger.warn(`Callback for order ${order.id} ignored — status is '${order.status}'`);
            return res.status(200).json({ success: true, message: 'Order already processed' });
          }
          run('UPDATE orders SET payment_method = ?, status = ? WHERE id = ?', ['JazzCash', 'confirmed', order.id]);
          logger.info(`Order ${order.id} updated: payment confirmed via JazzCash`);

          await createNotification(
            order.buyer_id,
            'payment_success',
            'Payment Successful',
            `Your JazzCash payment was confirmed. Your order is now being processed.`
          );
        } else {
          logger.warn(`Order not found for bill reference: ${pp_BillReference}`);
        }
      }

      return res.status(200).json({ success: true, message: 'Payment processed successfully' });
    }

    logger.warn(`JazzCash payment failed: ${pp_TxnRefNo} - ${pp_ResponseMessage}`);
    return res.status(200).json({ success: false, message: 'Payment failed' });

  } catch (err) {
    logger.error('JazzCash callback error:', err.message);
    return res.status(200).json({ success: false, message: 'Callback processing error' });
  }
};

module.exports = { getPaymentMethods, initiateJazzCashPayment, handleJazzCashCallback };
