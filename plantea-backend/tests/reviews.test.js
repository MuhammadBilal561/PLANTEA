// =============================================================
// tests/reviews.test.js
// Plantea — Reviews, seller replies, verification rules
// =============================================================
const request = require('supertest');
const app = require('../server');

const login = async (email = 'shehroz@test.com', password = 'Test1234') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
};

const getBuyerToken = () => login('shehroz@test.com');
const getSellerToken = () => login('zainab@test.com');
const getRiderToken = () => login('bilal@test.com');

// Creates a fresh delivered order + review so each test is isolated.
// Flow: seller confirms, rider picks up / transit / delivers.
const makeDeliveredOrder = async () => {
  const buyerToken = await getBuyerToken();
  const sellerToken = await getSellerToken();
  const riderToken = await getRiderToken();

  const list = await request(app).get('/api/plants?category=Medicinal&page_size=1');
  const plant = list.body.data.plants[0];

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

  // seller: pending -> confirmed; assign rider; rider: picked_up -> in_transit -> delivered
  await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${sellerToken}`)
    .send({ status: 'confirmed' });

  await request(app)
    .patch(`/api/orders/${orderId}/assign-rider`)
    .set('Authorization', `Bearer ${riderToken}`);

  for (const status of ['picked_up', 'in_transit', 'delivered']) {
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ status });
  }

  return { orderId, plantId: plant.id, sellerToken, buyerToken, riderToken };
};

describe('Reviews', () => {
  test('buyer can review a delivered order', async () => {
    const { orderId, sellerToken, buyerToken } = await makeDeliveredOrder();

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ order_id: orderId, rating: 5, comment: 'Lovely healthy plant!' });

    expect(res.status).toBe(201);
    expect(res.body.data.review.is_verified_purchase).toBe(1);
    expect(res.body.data.review.rating).toBe(5);
  });

  test('cannot review a non-delivered order', async () => {
    const buyerToken = await getBuyerToken();
    const sellerToken = await getSellerToken();

    const list = await request(app).get('/api/plants?category=Medicinal&page_size=1');
    const plant = list.body.data.plants[0];

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        plant_id: plant.id,
        quantity: 1,
        delivery_address: 'House 42, Street 7, Lahore',
        payment_method: 'COD',
      });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ order_id: created.body.data.id, rating: 4, comment: 'Too soon!' });

    expect(res.status).toBe(400);
  });

  test('cannot review another buyer\u2019s order (no IDOR)', async () => {
    const { orderId } = await makeDeliveredOrder();
    const otherToken = await login('admin@plantea.com');

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ order_id: orderId, rating: 5, comment: 'Not mine!' });

    expect(res.status).toBe(403);
  });

  test('duplicate review for the same order is rejected', async () => {
    const { orderId, buyerToken } = await makeDeliveredOrder();

    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ order_id: orderId, rating: 4, comment: 'First review' });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ order_id: orderId, rating: 5, comment: 'Second attempt' });

    expect(res.status).toBe(409);
  });

  test('seller can reply to a review on their plant', async () => {
    const { orderId, sellerToken, buyerToken } = await makeDeliveredOrder();

    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ order_id: orderId, rating: 4, comment: 'Good' });

    const reviewId = reviewRes.body.data.review.id;

    const res = await request(app)
      .post(`/api/reviews/${reviewId}/reply`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ reply: 'Thank you for your support!' });

    expect(res.status).toBe(200);
    expect(res.body.data.review.seller_reply).toBe('Thank you for your support!');
  });

  test('seller cannot reply to a review on someone else\u2019s plant', async () => {
    const { orderId, buyerToken } = await makeDeliveredOrder();

    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ order_id: orderId, rating: 4, comment: 'Good' });

    const reviewId = reviewRes.body.data.review.id;

    const otherSeller = await login('admin@plantea.com');
    const res = await request(app)
      .post(`/api/reviews/${reviewId}/reply`)
      .set('Authorization', `Bearer ${otherSeller}`)
      .send({ reply: 'Imposter!' });

    expect(res.status).toBe(403);
  });

  test('GET /api/reviews/seller/:id returns aggregated reviews', async () => {
    const { orderId, buyerToken } = await makeDeliveredOrder();

    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ order_id: orderId, rating: 5, comment: 'Five stars' });

    const list = await request(app).get('/api/plants?page_size=1');
    const sellerId = list.body.data.plants[0].seller.id;

    const res = await request(app).get(`/api/reviews/seller/${sellerId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rating_count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.reviews)).toBe(true);
  });
});
