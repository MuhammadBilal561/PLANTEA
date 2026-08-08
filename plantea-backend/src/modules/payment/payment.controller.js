// =============================================================
// src/modules/payment/payment.controller.js
// Plantea — JazzCash Payment Integration
// =============================================================
// Responsibility: Handle JazzCash payment initiation and callback.
//
// SE Principle — Third-Party Integration:
//   Payment gateway integration requires careful handling of
//   security (hash generation), error handling, and callback
//   processing. All sensitive data is validated and logged.
// =============================================================

const crypto = require('crypto');
const supabase = require('../../config/supabase');
const createNotification = require('../../utils/createNotification');
const ApiResponse = require('../../utils/ApiResponse');
const logger = require('../../utils/logger');

/**
 * POST /api/payments/jazzcash/initiate
 * Initiate a JazzCash payment transaction.
 */
const initiateJazzCashPayment = async (req, res, next) => {
  try {
    const { order_id, amount_pkr, phone_number } = req.body;

    // Validate required fields
    if (!order_id || !amount_pkr || !phone_number) {
      return ApiResponse.error(res, 'order_id, amount_pkr, and phone_number are required', 400);
    }

    // Validate phone number
    const phoneRegex = /^03[0-9]{9}$/;
    if (!phoneRegex.test(phone_number)) {
      return ApiResponse.error(res, 'Phone must be a valid Pakistani number (03XXXXXXXXX)', 400);
    }

    // Validate amount
    if (amount_pkr <= 0) {
      return ApiResponse.error(res, 'Amount must be greater than 0', 400);
    }

    // Generate transaction reference and datetime
    const txnDateTime = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const txnRefNo = 'T' + txnDateTime + Math.floor(Math.random() * 1000);
    const amountPaisas = String(Math.round(amount_pkr * 100));

    // Calculate expiry time (30 minutes from now)
    const expiryDate = new Date(Date.now() + 30 * 60 * 1000);
    const txnExpiryDateTime = expiryDate.toISOString().replace(/[^0-9]/g, '').slice(0, 14);

    // Build JazzCash parameters
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
      pp_BillReference: 'plantea-' + order_id.slice(0, 8),
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

    // Generate secure hash
    // Sort keys alphabetically and build hash string
    const sortedKeys = Object.keys(params).sort();
    const hashString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    
    // Prepend integrity salt
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT || '';
    const saltedString = integritySalt + '&' + hashString;
    
    // Generate SHA256 hash
    const secureHash = crypto
      .createHash('sha256')
      .update(saltedString)
      .digest('hex')
      .toUpperCase();

    // Add secure hash to params
    params.pp_SecureHash = secureHash;

    logger.info(`JazzCash payment initiated for order ${order_id}: ${txnRefNo}`);

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
 * This endpoint is called by JazzCash after payment processing.
 */
const handleJazzCashCallback = async (req, res) => {
  try {
    const { pp_ResponseCode, pp_TxnRefNo, pp_BillReference, pp_ResponseMessage } = req.body;

    logger.info(`JazzCash callback received: ${pp_TxnRefNo} - Response: ${pp_ResponseCode}`);

    // Check if payment was successful
    if (pp_ResponseCode === '000') {
      // Payment successful
      logger.info(`JazzCash payment successful: ${pp_TxnRefNo}`);

      // Extract order ID from bill reference (format: plantea-XXXXXXXX)
      if (pp_BillReference && pp_BillReference.startsWith('plantea-')) {
        const orderIdPrefix = pp_BillReference.replace('plantea-', '');

        // Find order by ID prefix
        const { data: orders, error: orderError } = await supabase
          .from('orders')
          .select('id, buyer_id, plant_id, plants:plant_id(name)')
          .ilike('id', `${orderIdPrefix}%`)
          .limit(1);

        if (!orderError && orders && orders.length > 0) {
          const order = orders[0];

          // Update order status and payment method
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_method: 'JazzCash',
              status: 'confirmed',
            })
            .eq('id', order.id);

          if (!updateError) {
            logger.info(`Order ${order.id} updated: payment confirmed via JazzCash`);

            // Create notification for buyer
            await createNotification(
              supabase,
              order.buyer_id,
              'payment_success',
              'Payment Successful',
              `Your JazzCash payment was confirmed. Your order for ${order.plants?.name || 'plant'} is now being processed.`
            );
          } else {
            logger.error(`Failed to update order ${order.id}:`, updateError.message);
          }
        } else {
          logger.warn(`Order not found for bill reference: ${pp_BillReference}`);
        }
      }

      // Respond to JazzCash (they need HTTP 200)
      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
      });

    } else {
      // Payment failed
      logger.warn(`JazzCash payment failed: ${pp_TxnRefNo} - ${pp_ResponseMessage}`);

      return res.status(200).json({
        success: false,
        message: 'Payment failed',
      });
    }

  } catch (err) {
    logger.error('JazzCash callback error:', err.message);
    
    // Still return 200 to JazzCash to prevent retries
    return res.status(200).json({
      success: false,
      message: 'Callback processing error',
    });
  }
};

module.exports = { initiateJazzCashPayment, handleJazzCashCallback };
