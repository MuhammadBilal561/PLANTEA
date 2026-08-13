// =============================================================
// tests/plants.test.js
// Plantea — Plant listing, search, filters, sort
// =============================================================
const request = require('supertest');
const app = require('../server');

const login = async (email = 'shehroz@test.com', password = 'Test1234') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
};

describe('Plants', () => {
  test('GET /api/plants returns seeded listings', async () => {
    const res = await request(app).get('/api/plants');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plants.length).toBeGreaterThan(0);
    expect(res.body.data.plants[0]).toHaveProperty('id');
    expect(res.body.data.plants[0]).toHaveProperty('price_pkr');
  });

  test('GET /api/plants supports pagination and page_size alias', async () => {
    const res = await request(app).get('/api/plants?page_size=5');
    expect(res.status).toBe(200);
    expect(res.body.data.plants.length).toBe(5);
    expect(res.body.data.totalPages).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/plants?search=monster finds Monstera', async () => {
    const res = await request(app).get('/api/plants?search=monster');
    expect(res.status).toBe(200);
    const names = res.body.data.plants.map((p) => p.name.toLowerCase());
    expect(names.some((n) => n.includes('monster'))).toBe(true);
  });

  test('GET /api/plants?category=Flowering filters correctly', async () => {
    const res = await request(app).get('/api/plants?category=Flowering');
    expect(res.status).toBe(200);
    expect(res.body.data.plants.length).toBeGreaterThan(0);
    res.body.data.plants.forEach((p) => expect(p.category).toBe('Flowering'));
  });

  test('GET /api/plants?sort=price_asc orders ascending', async () => {
    const res = await request(app).get('/api/plants?sort=price_asc');
    const prices = res.body.data.plants.map((p) => p.price_pkr);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('GET /api/plants?minPrice&maxPrice bounds results', async () => {
    const res = await request(app).get('/api/plants?minPrice=1000&maxPrice=2000');
    res.body.data.plants.forEach((p) => {
      expect(p.price_pkr).toBeGreaterThanOrEqual(1000);
      expect(p.price_pkr).toBeLessThanOrEqual(2000);
    });
  });

  test('GET /api/plants?seller filters by seller', async () => {
    const list = await request(app).get('/api/plants?page_size=1');
    const sellerId = list.body.data.plants[0].seller.id;
    const res = await request(app).get(`/api/plants?seller=${sellerId}`);
    expect(res.status).toBe(200);
    res.body.data.plants.forEach((p) => expect(p.seller.id).toBe(sellerId));
  });

  test('GET /api/plants/featured returns only featured', async () => {
    const res = await request(app).get('/api/plants/featured');
    expect(res.status).toBe(200);
    expect(res.body.data.plants.length).toBeGreaterThan(0);
    res.body.data.plants.forEach((p) => expect(p.featured).toBe(1));
  });

  test('GET /api/plants/categories returns unique categories', async () => {
    const res = await request(app).get('/api/plants/categories');
    expect(res.status).toBe(200);
    const cats = res.body.data.categories.map((c) => c.category);
    expect(new Set(cats).size).toBe(cats.length);
    expect(cats.length).toBeGreaterThan(0);
  });

  test('GET /api/plants/:id returns detail with seller + reviews + related', async () => {
    const list = await request(app).get('/api/plants?page_size=1');
    const plantId = list.body.data.plants[0].id;
    const res = await request(app).get(`/api/plants/${plantId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plant.seller).toHaveProperty('full_name');
    expect(Array.isArray(res.body.data.plant.related)).toBe(true);
    expect(res.body.data.plant).toHaveProperty('rating_avg');
  });

  test('GET /api/plants/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/plants/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(404);
  });

  test('POST /api/plants requires seller role', async () => {
    const token = await login();
    const res = await request(app)
      .post('/api/plants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cactus', price: 500, category: 'Indoor' });
    expect(res.status).toBe(403);
  });
});
