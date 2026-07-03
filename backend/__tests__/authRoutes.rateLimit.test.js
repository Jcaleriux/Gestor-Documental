const request = require('supertest');

const mockLogin = jest.fn();

jest.setTimeout(15000);

jest.mock('../services/authService', () => ({
  login: (...args) => mockLogin(...args),
}));

const ORIGINAL_ENV = new Map([
  ['AUTH_LOGIN_RATE_LIMIT_WINDOW_MS', process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS],
  ['AUTH_LOGIN_RATE_LIMIT_MAX', process.env.AUTH_LOGIN_RATE_LIMIT_MAX],
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

describe('auth login rate limit', () => {
  beforeEach(() => {
    jest.resetModules();
    mockLogin.mockReset().mockResolvedValue({
      user: { id: 1, email: 'admin@sendadocs.local' },
      token: 'token-demo',
    });
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '2';
  });

  afterAll(() => {
    restoreEnv();
  });

  test('POST /api/auth/login bloquea el tercer intento en la ventana configurada', async () => {
    let app;
    jest.isolateModules(() => {
      app = require('../server');
    });

    const credentials = { email: 'admin@sendadocs.local', password: 'SendaDocs2026!' };

    await request(app).post('/api/auth/login').send(credentials).expect(200);
    await request(app).post('/api/auth/login').send(credentials).expect(200);

    const blocked = await request(app).post('/api/auth/login').send(credentials).expect(429);

    expect(blocked.body).toMatchObject({
      success: false,
      message: 'Demasiados intentos. Intente de nuevo mas tarde.',
    });
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(mockLogin).toHaveBeenCalledTimes(2);
  });
});
