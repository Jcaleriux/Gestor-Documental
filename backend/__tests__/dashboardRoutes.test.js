const request = require('supertest');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

jest.mock('../services/dashboardService', () => ({
  getStats: (req, res) => res.json({ success: true, data: { totalFacturas: 1 } }),
  getWorkQueue: (req, res) => res.json({
    success: true,
    data: {
      facturas: { porPagar: 3 },
      tramites: { activos: 2 }
    }
  }),
  getRecentActivity: (req, res) => res.json({ success: true, data: [] }),
  getRecentDocuments: (req, res) => res.json({ success: true, data: [] })
}));

jest.mock('../services/permissionsService', () => ({
  permissionsService: {
    normalizePermissionList(permissionNames) {
      if (!Array.isArray(permissionNames)) return [];
      return [...new Set(permissionNames.filter(Boolean).map((permission) => String(permission).trim()))];
    },
    listPermissionsByRole: jest.fn(async (roleId) => {
      if (Number(roleId) === 10) {
        return ['documentos_aprobar_gerencia'];
      }

      if (Number(roleId) === 20) {
        return ['reservas_ver'];
      }

      return [];
    }),
    hasPermission(permissionNames, requiredPermission) {
      return Array.isArray(permissionNames) && permissionNames.includes(requiredPermission);
    },
    hasAnyPermission(permissionNames, requiredPermissions) {
      return Array.isArray(requiredPermissions) && requiredPermissions.some((permission) => permissionNames.includes(permission));
    },
    hasAllPermissions(permissionNames, requiredPermissions) {
      return Array.isArray(requiredPermissions) && requiredPermissions.every((permission) => permissionNames.includes(permission));
    }
  }
}));

const app = require('../server');

const signToken = (rol) => jwt.sign({ sub: rol, email: `rol${rol}@SendaDocs.test`, rol }, JWT_SECRET);
const withAuth = (req, rol) => req.set('Authorization', `Bearer ${signToken(rol)}`);

describe('Dashboard routes permissions', () => {
  test('GET /api/dashboard/stats permite acceso con permiso gerencial de workflow', async () => {
    const response = await withAuth(request(app).get('/api/dashboard/stats'), 10);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { totalFacturas: 1 }
    });
  });

  test('GET /api/dashboard/stats rechaza usuario sin permisos de dashboard', async () => {
    const response = await withAuth(request(app).get('/api/dashboard/stats'), 20);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false
    });
  });

  test('GET /api/dashboard/work-queue permite acceso con permiso gerencial de workflow', async () => {
    const response = await withAuth(request(app).get('/api/dashboard/work-queue'), 10);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        facturas: { porPagar: 3 },
        tramites: { activos: 2 }
      }
    });
  });
});
