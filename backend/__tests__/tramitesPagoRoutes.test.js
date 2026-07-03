const request = require('supertest');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

jest.mock('../services/tramitesPagoService', () => ({
  rechazoTesoreria: (req, res) => res.json({ success: true, data: {} }),
  accionTesoreria: (req, res) => res.json({ success: true, data: {} }),
  listTramites: (req, res) => res.json({ success: true, data: [{ id: 1 }] }),
  getRetencionesDisponibles: (req, res) => res.json({ success: true, data: [] }),
  getTramite: (req, res) => res.json({ success: true, data: { id: Number(req.params.id) } }),
  getTramitePdfUnificado: (req, res) => res.json({ success: true, data: { id: Number(req.params.id), format: 'pdf' } }),
  getHistorial: (req, res) => res.json({ success: true, data: [] }),
  uploadCaratulas: (req, res) => res.json({ success: true, data: {} }),
  resolveCaratulas: (req, res) => res.json({ success: true, data: {} }),
  confirmProviderCaratulaOrder: (req, res) => res.json({ success: true, data: {} }),
  uploadProviderCaratula: (req, res) => res.json({ success: true, data: {} }),
  confirmProviderCaratula: (req, res) => res.json({ success: true, data: {} }),
  assignOrphanCaratula: (req, res) => res.json({ success: true, data: {} }),
  discardOrphanCaratula: (req, res) => res.json({ success: true, data: {} }),
  crearTramite: (req, res) => res.json({ success: true, data: { id: 1 } }),
  cambiarEstado: (req, res) => res.json({ success: true, data: {} }),
  decisionDocumento: (req, res) => res.json({ success: true, data: {} })
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

describe('Tramites routes permissions', () => {
  test('GET /api/tramites-pago permite acceso con permiso de workflow aunque no tenga documentos_ver', async () => {
    const response = await withAuth(request(app).get('/api/tramites-pago'), 10);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [{ id: 1 }]
    });
  });

  test('GET /api/tramites-pago rechaza usuario sin permisos de lectura de tramites', async () => {
    const response = await withAuth(request(app).get('/api/tramites-pago'), 20);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false
    });
  });

  test('GET /api/tramites-pago/:id permite ver detalle con permiso de workflow', async () => {
    const response = await withAuth(request(app).get('/api/tramites-pago/7'), 10);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { id: 7 }
    });
  });

  test('GET /api/tramites-pago/:id/pdf-unificado permite descargar con permiso de workflow', async () => {
    const response = await withAuth(
      request(app).get('/api/tramites-pago/7/pdf-unificado?providerSortDirection=desc'),
      10
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { id: 7, format: 'pdf' }
    });
  });

  test('GET /api/tramites-pago/:id/pdf-unificado rechaza usuario sin permisos de lectura', async () => {
    const response = await withAuth(request(app).get('/api/tramites-pago/7/pdf-unificado'), 20);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false
    });
  });
});
