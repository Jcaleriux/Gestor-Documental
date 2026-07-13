import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERMISOS_LOAD_ERROR,
  buildUsuariosAdminLoadState,
} from '../../src/hooks/usuarios/usuariosAdminLoadState.js';

const fulfilled = (data) => ({
  status: 'fulfilled',
  value: {
    data: {
      success: true,
      data,
    },
  },
});

const rejected = (error) => ({
  status: 'rejected',
  reason: {
    response: {
      data: {
        error,
      },
    },
  },
});

test('buildUsuariosAdminLoadState conserva todos los catalogos cuando cargan correctamente', () => {
  const result = buildUsuariosAdminLoadState({
    usersResult: fulfilled([{ id: 1 }]),
    rolesResult: fulfilled([{ id: 2 }]),
    permisosResult: fulfilled([{ nombre: 'acceso_total' }]),
    sociedadesResult: fulfilled([{ id: 3 }]),
  });

  assert.deepEqual(result, {
    usuarios: [{ id: 1 }],
    roles: [{ id: 2 }],
    permisos: [{ nombre: 'acceso_total' }],
    sociedades: [{ id: 3 }],
    error: '',
  });
});

test('buildUsuariosAdminLoadState no descarta usuarios y roles si falla permisos', () => {
  const result = buildUsuariosAdminLoadState({
    usersResult: fulfilled([{ id: 1 }]),
    rolesResult: fulfilled([{ id: 2 }]),
    permisosResult: rejected('Ruta no encontrada'),
    sociedadesResult: fulfilled([{ id: 3 }]),
  });

  assert.deepEqual(result, {
    usuarios: [{ id: 1 }],
    roles: [{ id: 2 }],
    permisos: null,
    sociedades: [{ id: 3 }],
    error: PERMISOS_LOAD_ERROR,
  });
});

test('buildUsuariosAdminLoadState prioriza error critico de usuarios o roles', () => {
  const result = buildUsuariosAdminLoadState({
    usersResult: rejected('Token requerido'),
    rolesResult: fulfilled([{ id: 2 }]),
    permisosResult: rejected('Ruta no encontrada'),
    sociedadesResult: fulfilled([{ id: 3 }]),
  });

  assert.equal(result.usuarios, null);
  assert.deepEqual(result.roles, [{ id: 2 }]);
  assert.equal(result.error, 'Token requerido');
});
