const request = require('supertest');

jest.mock('../services/onboardingService', () => ({
  getStatus: jest.fn((req, res) => res.json({
    success: true,
    data: {
      requiresSetup: true,
      setupAllowed: true,
    },
  })),
  setupInitialAdmin: jest.fn((req, res) => res.json({
    success: true,
    data: {
      user: {
        id: 1,
        email: req.body.email,
        rol_codigo: 'admin',
      },
      status: {
        requiresSetup: false,
        setupAllowed: false,
      },
    },
  })),
}));

const onboardingService = require('../services/onboardingService');
const app = require('../app');

describe('Onboarding routes', () => {
  beforeEach(() => {
    onboardingService.getStatus.mockClear();
    onboardingService.setupInitialAdmin.mockClear();
  });

  test('GET /api/onboarding/status es publico', async () => {
    const response = await request(app).get('/api/onboarding/status');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        requiresSetup: true,
        setupAllowed: true,
      },
    });
    expect(onboardingService.getStatus).toHaveBeenCalledTimes(1);
  });

  test('POST /api/onboarding/setup valida password fuerte antes del servicio', async () => {
    const response = await request(app)
      .post('/api/onboarding/setup')
      .send({
        nombre: 'Admin',
        email: 'admin@sendadocs.local',
        password: 'corta',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Datos de onboarding invalidos',
    });
    expect(onboardingService.setupInitialAdmin).not.toHaveBeenCalled();
  });

  test('POST /api/onboarding/setup es publico con payload valido', async () => {
    const response = await request(app)
      .post('/api/onboarding/setup')
      .send({
        nombre: 'Admin',
        email: 'admin@sendadocs.local',
        password: 'ClaveFuerte2026!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          email: 'admin@sendadocs.local',
          rol_codigo: 'admin',
        },
        status: {
          requiresSetup: false,
        },
      },
    });
    expect(onboardingService.setupInitialAdmin).toHaveBeenCalledTimes(1);
  });
});
