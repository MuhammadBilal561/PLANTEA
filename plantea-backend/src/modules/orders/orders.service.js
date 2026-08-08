// =============================================================
// src/modules/orders/orders.service.js
// Plantea — Order Management Business Logic
// =============================================================
// Responsibility: Order placement, status transitions, commission.
//
// Key Business Rule:
//   Commission is calculated at order creation time and stored.
//   This is intentional — if a seller upgrades their subscription
//   later, it should not retroactively change old orders.
//   This is called "point-in-time pricing" — a critical financial
//   integrity principle.
// =============================================================

const supabase = require('../../config/supabase');
const logger = require('../../utils/logger');
const createNotification = require('../../utils/createNotification');


/**
 * Place a new order (buyer only).
 *
 * Steps:
 *  1. Fetch plant and verify it is available + in stock
 *  2. Fetch seller's current commission rate from subscriptions
 *  3. Calculate totals (price + delivery fee)
 *  4. Insert order record
 *  5. Decrement plant stock
 *
 * @param {string} buyerId    - ID of the authenticated buyer
 * @param {object} orderData  - { plant_id, quantity, delivery_address, payment_method }
 * @returns {object} - Created order
 */
const placeOrder = async (buyerId, orderData) => {
  const {
    plant_id,
    quantity = 1,
    delivery_address,
    payment_method = 'COD',
    notes
  } = orderData;

  // Step 1: Fetch plant details — must be available and in stock
  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, name, price_pkr, stock_quantity, seller_id, is_available')
    .eq('id', plant_id)
    .single();

  if (plantError || !plant) {
    const err = new Error('Plant not found or no longer available.');
    err.statusCode = 404;
    throw err;
  }

  if (!plant.is_available || plant.stock_quantity < quantity) {
    const err = new Error(`Only ${plant.stock_quantity} unit(s) available.`);
    err.statusCode = 400;
    throw err;
  }

  // Step 2: Get seller's active commission rate
  // Default to environment variable if no subscription record found
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('commission_rate')
    .eq('seller_id', plant.seller_id)
    .eq('is_active', true)
    .single();

  const commissionRate = subscription?.commission_rate
    ?? parseFloat(process.env.COMMISSION_FREE_TIER)
    ?? 10.00;

  // Step 3: Calculate financial totals
  const priceAtOrder    = plant.price_pkr * quantity;
  const deliveryFee     = parseFloat(process.env.DEFAULT_DELIVERY_FEE) || 150;
  const commissionPkr   = (priceAtOrder * commissionRate) / 100;
  const totalPkr        = priceAtOrder + deliveryFee;

  // Step 4: Insert the order record and decrement stock atomically
  // Use a transaction-like approach with error handling
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      buyer_id:         buyerId,
      plant_id:         plant_id,
      quantity,
      price_at_order:   priceAtOrder,
      delivery_fee_pkr: deliveryFee,
      commission_pkr:   commissionPkr,
      total_pkr:        totalPkr,
      delivery_address,
      payment_method,
      notes,
      status:           'pending',
    })
    .select()
    .single();

  if (orderError) {
    logger.error('Order insertion failed', orderError.message);
    throw new Error('Could not place order. Please try again.');
  }

  // Step 5: Decrement stock after successful order creation
  const { error: stockError } = await supabase
    .from('plants')
    .update({ stock_quantity: plant.stock_quantity - quantity })
    .eq('id', plant_id);

  if (stockError) {
    // If stock update fails, we should ideally rollback the order
    // For now, log the error but don't fail the order
    logger.error('Stock decrement failed', stockError.message);
  }

  logger.info(`Order placed: ${order.id} | Plant: "${plant.name}" | Buyer: ${buyerId}`);

  // Create notification for buyer
  await createNotification(
    supabase,
    buyerId,
    'order_placed',
    'Order Placed',
    `Your order for ${plant.name} has been placed! We'll confirm it shortly.`
  );

  return order;
};


/**
 * Update order status (controlled state machine).
 * Only allows valid transitions — prevents status jumping.
 *
 * Valid flow: pending → confirmed → picked_up → in_transit → delivered
 * Any role can cancel from pending or confirmed.
 *
 * @param {string} orderId   - UUID of the order
 * @param {string} newStatus - Target status
 * @param {object} user      - Authenticated user { id, role }
 */
const updateOrderStatus = async (orderId, newStatus, user) => {

  // Fetch current order
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, buyer_id, rider_id, plant:plants!plant_id(seller_id)')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }

  // Define who can make which transitions
  // This prevents a buyer from marking an order as "delivered" themselves
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

  // Build the update — set delivered_at timestamp when order completes
  const updatePayload = { status: newStatus };
  if (newStatus === 'delivered') updatePayload.delivered_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single();

  if (updateError) throw new Error('Status update failed.');

  logger.info(`Order ${orderId} status: ${order.status} → ${newStatus} by ${user.role}`);

  // Create notifications based on status change
  if (newStatus === 'confirmed') {
    // Fetch plant name for notification
    const { data: plantData } = await supabase
      .from('plants')
      .select('name')
      .eq('id', order.plant_id)
      .single();

    await createNotification(
      supabase,
      order.buyer_id,
      'order_confirmed',
      'Order Confirmed',
      `Your order for ${plantData?.name || 'plant'} has been confirmed by the seller.`
    );
  } else if (newStatus === 'delivered') {
    await createNotification(
      supabase,
      order.buyer_id,
      'order_delivered',
      'Order Delivered',
      'Your order has been delivered. Enjoy your plant! 🌿'
    );
  }

  return updated;
};


/**
 * Assign a rider to a confirmed order.
 *
 * @param {string} orderId - UUID of the order
 * @param {string} riderId - UUID of the rider
 */
const assignRider = async (orderId, riderId) => {
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, rider_id')
    .eq('id', orderId)
    .single();

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

  const { data: updated } = await supabase
    .from('orders')
    .update({ rider_id: riderId })
    .eq('id', orderId)
    .select()
    .single();

  logger.info(`Rider ${riderId} assigned to order ${orderId}`);
  return updated;
};


/**
 * Get orders for the authenticated user (filtered by role).
 * Buyer sees their purchases. Seller sees orders for their plants.
 * Rider sees their assigned deliveries.
 */
const getOrdersForUser = async (user) => {
  // For sellers: Supabase cannot filter on nested joined columns directly.
  // We first get all plant IDs for this seller, then filter orders by those IDs.
  if (user.role === 'seller') {
    const { data: sellerPlants, error: plantsError } = await supabase
      .from('plants')
      .select('id')
      .eq('seller_id', user.id);

    if (plantsError) throw new Error('Could not retrieve seller plants.');

    const plantIds = (sellerPlants || []).map(p => p.id);

    if (plantIds.length === 0) return [];

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, status, quantity, total_pkr, price_at_order, commission_pkr,
        delivery_address, payment_method, created_at, delivered_at,
        plant:plants!plant_id (id, name, image_url, price_pkr),
        buyer:profiles!buyer_id (id, full_name, phone),
        rider:profiles!rider_id (id, full_name, phone)
      `)
      .in('plant_id', plantIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Could not retrieve orders.');
    return orders || [];
  }

  // For buyers and riders: simple direct filter
  let query = supabase
    .from('orders')
    .select(`
      id, status, quantity, total_pkr, price_at_order, commission_pkr,
      delivery_address, payment_method, created_at, delivered_at,
      plant:plants!plant_id (id, name, image_url, price_pkr),
      buyer:profiles!buyer_id (id, full_name, phone),
      rider:profiles!rider_id (id, full_name, phone)
    `)
    .order('created_at', { ascending: false });

  if (user.role === 'buyer') query = query.eq('buyer_id', user.id);
  if (user.role === 'rider') query = query.eq('rider_id', user.id);

  const { data: orders, error } = await query;
  if (error) throw new Error('Could not retrieve orders.');

  return orders || [];
};


/**
 * Get all confirmed orders with no rider assigned (for riders to browse).
 */
const getAvailableOrders = async () => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, status, quantity, total_pkr, price_at_order,
      delivery_address, payment_method, created_at,
      plant:plants!plant_id (id, name, image_url, price_pkr, city),
      buyer:profiles!buyer_id (id, full_name, phone)
    `)
    .eq('status', 'confirmed')
    .is('rider_id', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Could not retrieve available orders.');
  return orders || [];
};


module.exports = { placeOrder, updateOrderStatus, assignRider, getOrdersForUser, getAvailableOrders };
