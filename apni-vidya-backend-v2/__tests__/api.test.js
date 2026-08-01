const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/db');

// These exercise the real middleware stack. The chosen routes resolve before
// any DB query (health, validation 400, 404, CORS), so they run without a
// live database.
afterAll(async () => {
  await db.pool.end();
});

describe('health & security headers', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('helmet security headers are present', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('per-user rate-limit headers are exposed', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });
});

describe('validation', () => {
  test('signup with bad input returns 400 with field details (no DB hit)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ phone: '123', password: 'x', full_name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['phone', 'password', 'full_name'])
    );
  });
});

describe('routing & CORS', () => {
  test('unknown API route returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  test('disallowed CORS origin is rejected', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Origin not allowed');
  });
});

describe('auth protection', () => {
  test('protected route without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('login accepts email or phone formats', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: 'admin@apnividya.demo', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email/phone or password');
  });
});
