// =============================================================
// src/modules/orders/orders.controller.js
// Plantea — Orders HTTP Controller
// =============================================================

const { validationResult } = require('express-validator');
const ordersService = require('./orders.service');
const ApiResponse = require('../../utils/ApiResponse');


/** POST /api/orders — Place an order (buyer only) */
const placeOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, 'Validation failed.', 422, errors.array());
    }
    const order = await ordersService.placeOrder(req.user.id, req.body);
    return ApiResponse.success(res, order, 'Order placed successfully!', 201);
  } catch (err) { next(err); }
};


/** GET /api/orders — Get current user's orders */
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await ordersService.getOrdersForUser(req.user);
    return ApiResponse.success(res, orders, 'Orders retrieved.');
  } catch (err) { next(err); }
};


/** PATCH /api/orders/:id/status — Update order status */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return ApiResponse.error(res, 'New status is required.', 400);
    const order = await ordersService.updateOrderStatus(req.params.id, status, req.user);
    return ApiResponse.success(res, order, `Order status updated to '${status}'.`);
  } catch (err) { next(err); }
};


/** PATCH /api/orders/:id/assign-rider — Rider self-assigns to an order */
const assignRider = async (req, res, next) => {
  try {
    const order = await ordersService.assignRider(req.params.id, req.user.id);
    return ApiResponse.success(res, order, 'You have been assigned to this delivery.');
  } catch (err) { next(err); }
};


/** GET /api/orders/available — Get all unassigned confirmed orders (riders only) */
const getAvailableOrders = async (req, res, next) => {
  try {
    const orders = await ordersService.getAvailableOrders();
    return ApiResponse.success(res, orders, 'Available orders retrieved.');
  } catch (err) { next(err); }
};


module.exports = { placeOrder, getMyOrders, updateStatus, assignRider, getAvailableOrders };
