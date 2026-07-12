const request = require('supertest');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

jest.mock('../services/exploradorDocumentosService', () => ({
  explorarDocumentos: (req, res) => res.json({
    success: true,
    data: {
      sociedadId: Number(req.query.sociedadId),
      documentos: [],
    },
  }),
}));

jest.mock('../services/permissionsService', () => ({
  permissionsService: {
    normalizePermissionList(permissionNames) {
      if (!Array.isArray(permissionNames)) return [];
      return [...new Set(permissionNames.filter(Boolean).map((permission) => String(permission).trim()))];
    },
    listPermissionsByRole: jest.fn(async (roleId) => {
      if (Number(roleId) === 10) {
        return ['documentos_ver'];
      }

      if (Number(roleId) === 20) {
        return ['documentos_contabilizar'];
      }

      if (Number(roleId) === 30) {
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
    },
  },
}));

const app = require('../server');

const signToken = (rol) => jwt.sign({ sub: rol, email: `rol${rol}@sendadocs.test`, rol }, JWT_SECRET);
const withAuth = (req, rol) => req.set('Authorization', `Bearer ${signToken(rol)}`);

describe('Explorador documentos routes permissions', () => {
  test('GET /api/explorador/documentos permite acceso con documentos_ver', async () => {
    const response = await withAuth(request(app).get('/api/explorador/documentos?sociedadId=18'), 10);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        sociedadId: 18,
        documentos: [],
      },
    });
  });

  test('GET /api/explorador/documentos permite acceso con permiso de workflow', async () => {
    const response = await withAuth(request(app).get('/api/explorador/documentos?sociedadId=18'), 20);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
  });

  test('GET /api/explorador/documentos rechaza usuario sin permisos documentales', async () => {
    const response = await withAuth(request(app).get('/api/explorador/documentos?sociedadId=18'), 30);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false });
  });
});
