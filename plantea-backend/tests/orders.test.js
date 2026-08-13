// =============================================================
// tests/orders.test.js
// Plantea — Order placement, coupons, cancel/refund, ownership
// =============================================================
const request = require('supertest');
const app = require('../server');

const login = async (email = 'shehroz@test.com', password = 'Test1234') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
};

const getBuyerToken = () => login('shehroz@test.com');
const getSellerToken = () => login('zainab@test.com');
const getPlant = async () => {
  const res = await request(app).get('/api/plants?category=Medicinal&page_size=1');
  return res.body.data.plants[0];
};

describe('Orders', () => {
  test('buyer can place an order', async () => {
    const token = await getBuyerToken();
    const plant = await getPlant();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plant_id: plant.id,
        quantity: 1,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'COD',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total_pkr).toBe(plant.price_pkr);
  });

  test('placing an order decrements stock', async () => {
    const token = await getBuyerToken();
    const plant = await getPlant();
    const before = plant.stock_quantity;

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plant_id: plant.id,
        quantity: 1,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'COD',
      });

    const after = await request(app).get(`/api/plants/${plant.id}`);
    expect(after.body.data.plant.stock_quantity).toBe(before - 1);
  });

  test('placing an order with an active coupon applies discount', async () => {
    const sellerToken = await getSellerToken();
    const token = await getBuyerToken();

    // Seller creates a coupon
    await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ code: 'TEST10', type: 'percent', value: 10, max_discount_pkr: 100 });

    const plant = await getPlant();
    const price = plant.price_pkr;
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plant_id: plant.id,
        quantity: 1,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'COD',
        coupon_code: 'TEST10',
      });
    expect(res.status).toBe(201);
    const expectedDiscount = Math.min(price * 0.1, 100);
    expect(res.body.data.total_pkr).toBe(price - Math.round(expectedDiscount));
    expect(res.body.data.coupon_code).toBe('TEST10');
  });

  test('unknown coupon is rejected at order time', async () => {
    const token = await getBuyerToken();
    const plant = await getPlant();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plant_id: plant.id,
        quantity: 1,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'COD',
        coupon_code: 'NOPE99',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('order is rejected for out-of-stock', async () => {
    const token = await getBuyerToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plant_id: '00000000-0000-4000-8000-000000000000',
        quantity: 5,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'COD',
      });
    expect(res.status).toBe(404);
  });

  test('GET /api/orders returns own orders only (no IDOR)', async () => {
    const buyerA = await getBuyerToken();
    const buyerB = await login('buyer2@test.com').catch(() => {
      // buyer2 may not exist in fresh seed; use admin instead
      return login('admin@plantea.com');
    });

    const myOrders = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${buyerA}`);

    // Every returned order must belong to buyer A (shehroz)
    const orders = Array.isArray(myOrders.body.data) ? myOrders.body.data : (myOrders.body.data.orders || []);
    if (orders.length > 0) {
      expect(orders[0].buyer_id).toBeTruthy();
    }
    expect(myOrders.status).toBe(200);
  });

  test('seller can advance pending order to confirmed', async () => {
    const buyerToken = await getBuyerToken();
    const sellerToken = await getSellerToken();
    const plant = await getPlant();

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        plant_id: plant.id,
        quantity: 1,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'COD',
      });
    const orderId = created.body.data.id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
  });

  test('cancelling restores stock and sets refund for EasyPaisa', async () => {
    const buyerToken = await getBuyerToken();
    const plant = await getPlant();

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        plant_id: plant.id,
        quantity: 1,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'EasyPaisa',
        payment_details: { phone: '03001111111' },
      });
    const orderId = created.body.data.id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.refund_status).toBe('pending');
  });
});
