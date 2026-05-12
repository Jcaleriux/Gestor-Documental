const request = require('supertest');

const ORIGINAL_ENV = new Map([
  ['NODE_ENV', process.env.NODE_ENV],
  ['CORS_ALLOWED_ORIGINS', process.env.CORS_ALLOWED_ORIGINS],
]);

const restoreEnv = () => {
  ORIGINAL_ENV.forEach((value, key) => {
    if (typeof value === 'undefined') {
      delete process.env[key];
      return;
    }

    process.env[key] = value;
  });
};

describe('app CORS policy', () => {
  afterAll(() => {
    restoreEnv();
  });

  test('mantiene CORS relajado por compatibilidad cuando no hay allowlist explicita', async () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'test';

    jest.resetModules();
    const app = require('../server');

    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://dev-client.example.com');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
  });

  test('aplica allowlist explicita cuando CORS_ALLOWED_ORIGINS esta configurado', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';

    jest.resetModules();
    const app = require('../server');

    const allowed = await request(app)
      .get('/api/health')
      .set('Origin', 'https://app.example.com');

    const blocked = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');

    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com');
    expect(blocked.status).toBe(200);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});
