// =============================================================
// tests/auth.test.js
// Plantea — Authentication endpoints
// =============================================================
const request = require('supertest');
const app = require('../server');

describe('Authentication', () => {
  test('POST /api/auth/login succeeds with seeded buyer', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'shehroz@test.com', password: 'Test1234' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('buyer');
  });

  test('POST /api/auth/login rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'shehroz@test.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/register creates a new buyer', async () => {
    const email = `testbuyer${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Buyer',
        email,
        phone: '03011112222',
        password: 'Test1234',
        role: 'buyer',
        city: 'Lahore',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  });

  test('POST /api/auth/register rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Dup Buyer',
        email: 'shehroz@test.com',
        phone: '03019998888',
        password: 'Test1234',
        role: 'buyer',
        city: 'Lahore',
      });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me requires a valid token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
