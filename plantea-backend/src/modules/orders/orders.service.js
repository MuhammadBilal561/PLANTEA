// =============================================================
// src/modules/orders/orders.service.js
// Plantea — Order Management Business Logic
// =============================================================
// Responsibility: Order placement, status transitions.
//
// Free platform: commission_pkr is always 0 and the delivery fee
// defaults to Rs. 0 for COD self-pickup; sellers keep 100%.
// =============================================================

const { query, get, run, uuid, transaction } = require('../../config/db');
const logger = require('../../utils/logger');
const { roundMoney } = require('../../utils/money');
const couponsService = require('../coupons/coupons.service');
const createNotification = require('../../utils/createNotification');


/**
 * Place a new order (buyer only).
 * Atomically decrements stock so two buyers can't over-order.
 */
const placeOrder = async (buyerId, orderData) => {
  const {
    plant_id,
    quantity = 1,
    delivery_address,
    payment_method = 'COD',
    coupon_code,
    notes
  } = orderData;

  const qty = Math.max(1, parseInt(quantity) || 1);

  const place = transaction(() => {
    // Lock the plant row for this transaction
    const plant = get(
      `SELECT id, name, price_pkr, stock_quantity, seller_id, is_available
       FROM plants WHERE id = ?`,
      [plant_id]
    );

    if (!plant || !plant.is_available) {
      const err = new Error('Plant not found or no longer available.');
      err.statusCode = 404;
      throw err;
    }

    if (plant.stock_quantity < qty) {
      const err = new Error(`Only ${plant.stock_quantity} unit(s) available.`);
      err.statusCode = 400;
      throw err;
    }

    const priceAtOrder  = roundMoney(plant.price_pkr * qty);
    const deliveryFee   = roundMoney(parseFloat(process.env.DEFAULT_DELIVERY_FEE) || 0);
    const commissionPkr = 0; // platform is free — sellers keep 100%

    // Apply promo code (validated inside applyCoupon)
    let discountPkr = 0;
    if (coupon_code && String(coupon_code).trim()) {
      discountPkr = couponsService.applyCoupon(coupon_code, priceAtOrder, buyerId);
    }

    const totalPkr = roundMoney(Math.max(0, priceAtOrder + deliveryFee - discountPkr));

    const orderId = uuid();
    run(
      `INSERT INTO orders
         (id, buyer_id, plant_id, quantity, price_at_order, delivery_fee_pkr,
          commission_pkr, discount_pkr, total_pkr, delivery_address, payment_method,
          coupon_code, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderId, buyerId, plant_id, qty, priceAtOrder, deliveryFee,
        commissionPkr, discountPkr, totalPkr, delivery_address, payment_method,
        (coupon_code && String(coupon_code).trim()) ? String(coupon_code).trim().toUpperCase() : null,
        notes || null
      ]
    );

    // Decrement stock atomically
    run('UPDATE plants SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, plant_id]);

    return { orderId, plant };
  });

  const { orderId, plant } = place();

  const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);

  logger.info(`Order placed: ${order.id} | Plant: "${plant.name}" | Buyer: ${buyerId}`);

  await createNotification(
    buyerId,
    'order_placed',
    'Order Placed',
    `Your order for ${plant.name} has been placed! We'll confirm it shortly.`
  );

  return order;
};


/**
 * Update order status (controlled state machine).
 * Valid flow: pending → confirmed → picked_up → in_transit → delivered
 * Only the order's buyer, the plant's seller, and the assigned rider may
 * update an order, and only within their allowed transitions.
 */
const updateOrderStatus = async (orderId, newStatus, user) => {
  const order = get(
    `SELECT o.id, o.status, o.buyer_id, o.rider_id, o.plant_id, o.quantity,
            o.payment_method, p.name AS plant_name, p.seller_id
     FROM orders o JOIN plants p ON p.id = o.plant_id
     WHERE o.id = ?`,
    [orderId]
  );

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  // Ownership checks (prevent IDOR — users must only act on their own orders)
  if (user.role === 'buyer' && order.buyer_id !== user.id) {
    const err = new Error('You can only manage your own orders.');
    err.statusCode = 403;
    throw err;
  }
  if (user.role === 'seller' && order.seller_id !== user.id) {
    const err = new Error('You can only manage orders for your own listings.');
    err.statusCode = 403;
    throw err;
  }
  if (user.role === 'rider' && order.rider_id !== user.id) {
    const err = new Error('You can only manage orders assigned to you.');
    err.statusCode = 403;
    throw err;
  }

  const allowedTransitions = {
    seller: { pending: 'confirmed', confirmed: 'cancelled' },
    rider:  { confirmed: 'picked_up', picked_up: 'in_transit', in_transit: 'delivered' },
    buyer:  { pending: 'cancelled' },
  };

  const allowed = allowedTransitions[user.role];
  if (!allowed || allowed[order.status] !== newStatus) {
    const err = new Error(`Cannot change status from '${order.status}' to '${newStatus}'.`);
    err.statusCode = 400;
    throw err;
  }

  const update = transaction(() => {
    const sets = ['status = ?'];
    const params = [newStatus];
    if (newStatus === 'delivered') {
      sets.push('delivered_at = ?');
      params.push(new Date().toISOString());
    }
    if (newStatus === 'cancelled') {
      // Record cancellation (admin/finance transparency) + auto-refund marker
      sets.push('cancelled_at = ?', 'cancelled_by = ?');
      params.push(new Date().toISOString(), user.role);
      if (order.payment_method && order.payment_method !== 'COD') {
        sets.push('refund_status = ?');
        params.push('pending');
      }
    }
    params.push(orderId);
    run(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);

    // Cancelled orders must return stock to the seller's inventory
    if (newStatus === 'cancelled' && order.status !== 'cancelled') {
      run('UPDATE plants SET stock_quantity = stock_quantity + ? WHERE id = ?', [order.quantity, order.plant_id]);
      logger.info(`Order ${orderId} cancelled — restored ${order.quantity} unit(s) to plant ${order.plant_id}`);
    }

    // Delivered orders count toward the plant's "sold" analytics
    if (newStatus === 'delivered') {
      run('UPDATE plants SET sold_count = sold_count + ? WHERE id = ?', [order.quantity, order.plant_id]);
      logger.info(`Order ${orderId} delivered — sold_count +${order.quantity} for plant ${order.plant_id}`);
    }
  });
  update();

  const updated = get('SELECT * FROM orders WHERE id = ?', [orderId]);
  logger.info(`Order ${orderId} status: ${order.status} → ${newStatus} by ${user.role}`);

  if (newStatus === 'confirmed') {
    await createNotification(
      order.buyer_id,
      'order_confirmed',
      'Order Confirmed',
      `Your order for ${order.plant_name || 'plant'} has been confirmed by the seller.`
    );
  } else if (newStatus === 'delivered') {
    await createNotification(
      order.buyer_id,
      'order_delivered',
      'Order Delivered',
      'Your order has been delivered. Enjoy your plant!'
    );
  } else if (newStatus === 'cancelled') {
    await createNotification(
      order.buyer_id,
      'order_cancelled',
      'Order Cancelled',
      `Your order for ${order.plant_name || 'plant'} was cancelled.`
    );
  }

  return updated;
};


/**
 * Assign a rider to a confirmed order.
 */
const assignRider = async (orderId, riderId) => {
  const order = get('SELECT id, status, rider_id FROM orders WHERE id = ?', [orderId]);

  if (!order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  if (order.status !== 'confirmed') {
    const err = new Error('Rider can only be assigned to confirmed orders.');
    err.statusCode = 400;
    throw err;
  }

  if (order.rider_id) {
    const err = new Error('A rider is already assigned to this order.');
    err.statusCode = 409;
    throw err;
  }

  run('UPDATE orders SET rider_id = ? WHERE id = ?', [riderId, orderId]);

  const updated = get(
    `SELECT o.*, p.name AS plant_name FROM orders o
     JOIN plants p ON p.id = o.plant_id WHERE o.id = ?`,
    [orderId]
  );

  await createNotification(
    updated.buyer_id,
    'order_rider_assigned',
    'Rider Assigned',
    `A rider has been assigned to your order for ${updated.plant_name || 'plant'}.`
  );

  logger.info(`Rider ${riderId} assigned to order ${orderId}`);
  return updated;
};


/**
 * Get orders for the authenticated user (filtered by role).
 */
const getOrdersForUser = async (user) => {
  let orders;

  if (user.role === 'seller') {
    orders = query(
      `SELECT o.*, p.id AS plant_id, p.name AS plant_name, p.image_url, p.price_pkr AS plant_price,
              u_buyer.id AS buyer_id, u_buyer.full_name AS buyer_full_name, u_buyer.phone AS buyer_phone,
              u_rider.id AS rider_id, u_rider.full_name AS rider_full_name, u_rider.phone AS rider_phone
       FROM orders o
       JOIN plants p ON p.id = o.plant_id
       JOIN users u_buyer ON u_buyer.id = o.buyer_id
       LEFT JOIN users u_rider ON u_rider.id = o.rider_id
       WHERE p.seller_id = ?
       ORDER BY o.created_at DESC`,
      [user.id]
    );
  } else {
    const field = user.role === 'buyer' ? 'o.buyer_id' : 'o.rider_id';
    orders = query(
      `SELECT o.*, p.id AS plant_id, p.name AS plant_name, p.image_url, p.price_pkr AS plant_price,
              u_seller.id AS seller_id, u_seller.full_name AS seller_full_name,
              u_buyer.id AS buyer_id, u_buyer.full_name AS buyer_full_name, u_buyer.phone AS buyer_phone,
              u_rider.id AS rider_id, u_rider.full_name AS rider_full_name, u_rider.phone AS rider_phone
       FROM orders o
       JOIN plants p ON p.id = o.plant_id
       JOIN users u_seller ON u_seller.id = p.seller_id
       JOIN users u_buyer ON u_buyer.id = o.buyer_id
       LEFT JOIN users u_rider ON u_rider.id = o.rider_id
       WHERE ${field} = ?
       ORDER BY o.created_at DESC`,
      [user.id]
    );
  }

  return orders.map((o) => ({
    ...o,
    plant: o.plant_id
      ? { id: o.plant_id, name: o.plant_name, image_url: o.image_url, price_pkr: o.plant_price }
      : null,
    seller: o.seller_id
      ? { id: o.seller_id, full_name: o.seller_full_name }
      : null,
    buyer: o.buyer_id
      ? { id: o.buyer_id, full_name: o.buyer_full_name, phone: o.buyer_phone }
      : null,
    rider: o.rider_id
      ? { id: o.rider_id, full_name: o.rider_full_name, phone: o.rider_phone }
      : null,
  }));
};


/**
 * Get all confirmed orders with no rider assigned (riders browse these).
 */
const getAvailableOrders = async () => {
  const rows = query(
    `SELECT o.*, p.id AS plant_id, p.name AS plant_name, p.image_url, p.city AS plant_city,
            u_buyer.id AS buyer_id, u_buyer.full_name AS buyer_full_name, u_buyer.phone AS buyer_phone
     FROM orders o
     JOIN plants p ON p.id = o.plant_id
     JOIN users u_buyer ON u_buyer.id = o.buyer_id
     WHERE o.status = 'confirmed' AND o.rider_id IS NULL
     ORDER BY o.created_at DESC`
  );

  return rows.map((o) => ({
    ...o,
    plant: o.plant_id
      ? { id: o.plant_id, name: o.plant_name, image_url: o.image_url, city: o.plant_city }
      : null,
    buyer: o.buyer_id
      ? { id: o.buyer_id, full_name: o.buyer_full_name, phone: o.buyer_phone }
      : null,
  }));
};


module.exports = { placeOrder, updateOrderStatus, assignRider, getOrdersForUser, getAvailableOrders };
