// =============================================================
// tests/capabilities.test.js
// Plantea — Coupons, Garden, Analytics, Admin, Public profile
// =============================================================
const request = require('supertest');
const app = require('../server');

const login = async (email = 'shehroz@test.com', password = 'Test1234') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
};

const getBuyerToken = () => login('shehroz@test.com');
const getSellerToken = () => login('zainab@test.com');
const getAdminToken = () => login('admin@plantea.com');

const getPlantId = async () => {
  const res = await request(app).get('/api/plants?page_size=1');
  return res.body.data.plants[0].id;
};

describe('Coupons', () => {
  test('buyer can preview a valid coupon', async () => {
    const sellerToken = await getSellerToken();
    await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ code: 'P5', type: 'percent', value: 5 });

    const buyerToken = await getBuyerToken();
    const res = await request(app)
      .post('/api/coupons/preview')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ code: 'P5', subtotal: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.data.discount_pkr).toBe(50);
  });

  test('buyer cannot preview an invalid coupon', async () => {
    const buyerToken = await getBuyerToken();
    const res = await request(app)
      .post('/api/coupons/preview')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ code: 'FAKE99', subtotal: 1000 });
    expect(res.status).toBe(400);
  });

  test('only seller/admin can create coupons', async () => {
    const buyerToken = await getBuyerToken();
    const res = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ code: 'NOPE', type: 'percent', value: 10 });
    expect(res.status).toBe(403);
  });
});

describe('Garden', () => {
  test('buyer can save a plant to their garden', async () => {
    const token = await getBuyerToken();
    const plantId = await getPlantId();

    const res = await request(app)
      .post('/api/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ plant_id: plantId, nickname: 'Lucky' });
    expect(res.status).toBe(201);
    expect(res.body.data.item.plant_id).toBe(plantId);
    expect(res.body.data.item.nickname).toBe('Lucky');
  });

  test('garden list returns joined plant data', async () => {
    const token = await getBuyerToken();
    const plantId = await getPlantId();
    await request(app).post('/api/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ plant_id: plantId });

    const res = await request(app).get('/api/garden')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.garden.length).toBeGreaterThan(0);
    expect(res.body.data.garden[0]).toHaveProperty('name');
    expect(res.body.data.garden[0]).toHaveProperty('garden_id');
  });

  test('buyer can remove a garden item', async () => {
    const token = await getBuyerToken();
    const plantId = await getPlantId();
    const add = await request(app).post('/api/garden')
      .set('Authorization', `Bearer ${token}`)
      .send({ plant_id: plantId });
    const gardenId = add.status === 409
      ? (await request(app).get('/api/garden').set('Authorization', `Bearer ${token}`)).body.data.garden[0].garden_id
      : add.body.data.item.id;

    const res = await request(app).delete(`/api/garden/${gardenId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('Analytics', () => {
  test('seller gets totals + revenue_chart + top_plants', async () => {
    const token = await getSellerToken();
    const res = await request(app).get('/api/analytics/seller')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totals).toHaveProperty('total_orders');
    expect(Array.isArray(res.body.data.revenue_chart)).toBe(true);
    expect(Array.isArray(res.body.data.top_plants)).toBe(true);
    expect(res.body.data.plant_summary).toHaveProperty('total_listings');
  });

  test('admin gets platform analytics', async () => {
    const token = await getAdminToken();
    const res = await request(app).get('/api/analytics/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toHaveProperty('total_orders');
  });

  test('buyer is denied seller analytics', async () => {
    const token = await getBuyerToken();
    const res = await request(app).get('/api/analytics/seller')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('Admin', () => {
  test('admin can list users', async () => {
    const token = await getAdminToken();
    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(4);
  });

  test('admin can mark a seller verified', async () => {
    const token = await getAdminToken();

    // find the seller
    const list = await request(app).get('/api/admin/users?role=seller')
      .set('Authorization', `Bearer ${token}`);
    const seller = list.body.data.users.find((u) => u.email === 'zainab@test.com');

    const res = await request(app)
      .patch(`/api/admin/users/${seller.id}/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_verified: true });
    expect(res.status).toBe(200);
    expect(res.body.data.user.is_verified).toBe(1);
  });

  test('non-admin cannot access admin endpoints', async () => {
    const token = await getBuyerToken();
    const res = await request(app).get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('admin sees verification requests', async () => {
    const token = await getAdminToken();
    const res = await request(app).get('/api/admin/verifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.requests)).toBe(true);
  });
});

describe('Public profile', () => {
  test('public profile hides email and phone', async () => {
    const list = await request(app).get('/api/plants?page_size=1');
    const sellerId = list.body.data.plants[0].seller.id;

    const res = await request(app).get(`/api/users/${sellerId}/public`);
    expect(res.status).toBe(200);
    expect(res.body.data.user).toHaveProperty('full_name');
    expect(res.body.data.user).not.toHaveProperty('email');
    expect(res.body.data.user).not.toHaveProperty('phone');
  });
});
