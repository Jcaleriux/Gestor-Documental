const request = require('supertest');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

jest.mock('../services/sociedadesService', () => ({
  listSociedades: (req, res) => res.json({ success: true, data: [{ id: 1, activo: true }] }),
  listSociedadesAdmin: (req, res) => res.json({ success: true, data: [{ id: 1, activo: false }] }),
  createSociedad: (req, res) => res.json({ success: true, data: { id: 2, ...req.body } }),
  updateSociedad: (req, res) => res.json({ success: true, data: { id: Number(req.params.id), ...req.body } }),
}));

jest.mock('../services/permissionsService', () => ({
  permissionsService: {
    normalizePermissionList(permissionNames) {
      if (!Array.isArray(permissionNames)) return [];
      return [...new Set(permissionNames.filter(Boolean).map((permission) => String(permission).trim()))];
    },
    listPermissionsByRole: jest.fn(async (roleId) => {
      if (Number(roleId) === 10) {
        return ['sociedades_administrar'];
      }

      if (Number(roleId) === 20) {
        return ['sociedades_todas'];
      }

      return [];
    }),
    hasPermission(permissionNames, requiredPermission) {
      return Array.isArray(permissionNames)
        && (permissionNames.includes('acceso_total') || permissionNames.includes(requiredPermission));
    },
    hasAnyPermission(permissionNames, requiredPermissions) {
      return Array.isArray(requiredPermissions)
        && (
          permissionNames.includes('acceso_total')
          || requiredPermissions.some((permission) => permissionNames.includes(permission))
        );
    },
    hasAllPermissions(permissionNames, requiredPermissions) {
      return Array.isArray(requiredPermissions)
        && (
          permissionNames.includes('acceso_total')
          || requiredPermissions.every((permission) => permissionNames.includes(permission))
        );
    },
  },
}));

const app = require('../server');

const signToken = (rol) => jwt.sign({ sub: rol, email: `rol${rol}@SendaDocs.test`, rol }, JWT_SECRET);
const withAuth = (req, rol) => req.set('Authorization', `Bearer ${signToken(rol)}`);

describe('Sociedades routes permissions', () => {
  test('GET /api/sociedades mantiene acceso operativo con sociedades_todas', async () => {
    const response = await withAuth(request(app).get('/api/sociedades'), 20);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [{ id: 1, activo: true }],
    });
  });

  test('GET /api/sociedades/admin requiere sociedades_administrar', async () => {
    const denied = await withAuth(request(app).get('/api/sociedades/admin'), 20);
    expect(denied.status).toBe(403);

    const allowed = await withAuth(request(app).get('/api/sociedades/admin'), 10);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toMatchObject({
      success: true,
      data: [{ id: 1, activo: false }],
    });
  });

  test('POST /api/sociedades requiere sociedades_administrar', async () => {
    const payload = {
      razon_social: 'Nueva SA',
      cedula_juridica: '3101000000',
    };

    const denied = await withAuth(request(app).post('/api/sociedades').send(payload), 20);
    expect(denied.status).toBe(403);

    const allowed = await withAuth(request(app).post('/api/sociedades').send(payload), 10);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toMatchObject({
      success: true,
      data: payload,
    });
  });
});
