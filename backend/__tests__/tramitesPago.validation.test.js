const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { JWT_SECRET } = require('../config/auth');
const { PERMISSIONS } = require('../domain/permissions');

const token = jwt.sign({
  sub: 1,
  email: 'test@example.com',
  rol: 1,
  permissions: [
    PERMISSIONS.DOCUMENTOS_VER,
    PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO
  ]
}, JWT_SECRET);
const withAuth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Tramites Pago - validaciones basicas', () => {
  test('POST /api/tramites-pago/:id/estado requiere estado', async () => {
    const res = await withAuth(request(app)
      .post('/api/tramites-pago/1/estado'))
      .send({ usuario: 'test' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: 'estado requerido'
    });
  });

  test('POST /api/tramites-pago/:id/documentos/:facturaId/tesoreria accion invalida', async () => {
    const res = await withAuth(request(app)
      .post('/api/tramites-pago/1/documentos/2/tesoreria'))
      .send({ accion: 'no_valida' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: 'accion invalida'
    });
  });

  test('POST /api/tramites-pago/:id/documentos/:facturaId/tesoreria destino invalido', async () => {
    const res = await withAuth(request(app)
      .post('/api/tramites-pago/1/documentos/2/tesoreria'))
      .send({ accion: 'reenviar', destino: 'otro_estado' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: 'destino invalido'
    });
  });

  test('POST /api/tramites-pago/:id/documentos/:facturaId/decision etapa invalida', async () => {
    const res = await withAuth(request(app)
      .post('/api/tramites-pago/1/documentos/2/decision'))
      .send({ etapa: 'otra', decision: 'aprobado' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: 'etapa invalida'
    });
  });

  test('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true
    });
  });
});
