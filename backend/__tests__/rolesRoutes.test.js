const request = require('supertest');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');

jest.mock('../services/rolesService', () => ({
  listRoles: (req, res) => res.json({ success: true, data: [{ id: 1, codigo: 'admin' }] }),
  listPermisos: (req, res) => res.json({ success: true, data: [{ id: 1, nombre: 'acceso_total' }] }),
  createRole: jest.fn((req, res) => res.json({ success: true, data: { id: 2, ...req.body } })),
  updateRole: jest.fn((req, res) => res.json({ success: true, data: { id: Number(req.params.id), ...req.body } })),
  setRolePermissions: jest.fn((req, res) => res.json({
    success: true,
    data: { id: Number(req.params.id), permisos: req.body.permisos }
  })),
}));

jest.mock('../services/permissionsService', () => ({
  permissionsService: {
    normalizePermissionList(permissionNames) {
      if (!Array.isArray(permissionNames)) return [];
      return [...new Set(permissionNames.filter(Boolean).map((permission) => String(permission).trim()))];
    },
    listPermissionsByRole: jest.fn(async (roleId) => {
      if (Number(roleId) === 10) {
        return ['usuarios_administrar'];
      }

      if (Number(roleId) === 20) {
        return ['documentos_ver'];
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

const rolesService = require('../services/rolesService');
const app = require('../server');

const signToken = (rol) => jwt.sign({ sub: rol, email: `rol${rol}@sendadocs.test`, rol }, JWT_SECRET);
const withAuth = (req, rol) => req.set('Authorization', `Bearer ${signToken(rol)}`);

describe('Roles routes permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/roles y /api/permisos requieren usuarios_administrar', async () => {
    const deniedRoles = await withAuth(request(app).get('/api/roles'), 20);
    const deniedPermisos = await withAuth(request(app).get('/api/permisos'), 20);
    expect(deniedRoles.status).toBe(403);
    expect(deniedPermisos.status).toBe(403);

    const allowedRoles = await withAuth(request(app).get('/api/roles'), 10);
    const allowedPermisos = await withAuth(request(app).get('/api/permisos'), 10);
    expect(allowedRoles.status).toBe(200);
    expect(allowedRoles.body).toMatchObject({ success: true, data: [{ codigo: 'admin' }] });
    expect(allowedPermisos.status).toBe(200);
    expect(allowedPermisos.body).toMatchObject({ success: true, data: [{ nombre: 'acceso_total' }] });
  });

  test('POST /api/roles valida payload y permite crear con usuarios_administrar', async () => {
    const invalid = await withAuth(request(app).post('/api/roles').send({
      codigo: 'Rol Malo',
      nombre: 'Rol malo',
      nivel_jerarquia: 30,
    }), 10);
    expect(invalid.status).toBe(400);
    expect(rolesService.createRole).not.toHaveBeenCalled();

    const payload = {
      codigo: 'qa_operativo',
      nombre: 'QA operativo',
      descripcion: 'Control operativo',
      nivel_jerarquia: 35,
      permisos: ['documentos_ver'],
    };
    const allowed = await withAuth(request(app).post('/api/roles').send(payload), 10);

    expect(allowed.status).toBe(200);
    expect(allowed.body).toMatchObject({ success: true, data: payload });
    expect(rolesService.createRole).toHaveBeenCalledTimes(1);
  });

  test('PATCH /api/roles/:id y PUT /api/roles/:id/permisos quedan protegidos', async () => {
    const deniedUpdate = await withAuth(request(app).patch('/api/roles/2').send({
      nombre: 'QA',
      nivel_jerarquia: 20,
    }), 20);
    const deniedPermissions = await withAuth(request(app).put('/api/roles/2/permisos').send({
      permisos: ['documentos_ver'],
    }), 20);
    expect(deniedUpdate.status).toBe(403);
    expect(deniedPermissions.status).toBe(403);

    const allowedUpdate = await withAuth(request(app).patch('/api/roles/2').send({
      nombre: 'QA',
      descripcion: '',
      nivel_jerarquia: 20,
      permisos: ['documentos_ver'],
    }), 10);
    const allowedPermissions = await withAuth(request(app).put('/api/roles/2/permisos').send({
      permisos: ['documentos_ver'],
    }), 10);

    expect(allowedUpdate.status).toBe(200);
    expect(allowedUpdate.body).toMatchObject({ success: true, data: { id: 2, nombre: 'QA' } });
    expect(allowedPermissions.status).toBe(200);
    expect(allowedPermissions.body).toMatchObject({
      success: true,
      data: { id: 2, permisos: ['documentos_ver'] },
    });
  });
});
