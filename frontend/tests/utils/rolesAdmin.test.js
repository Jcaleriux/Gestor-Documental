import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRoleFormPayload,
  countRolePermissions,
  groupPermisosByPrefix,
  normalizePermissionNames,
} from '../../src/utils/rolesAdmin.js';

test('normalizePermissionNames elimina vacios, duplicados y ordena permisos', () => {
  assert.deepEqual(normalizePermissionNames([
    ' documentos_ver ',
    '',
    null,
    'usuarios_administrar',
    'documentos_ver',
  ]), ['documentos_ver', 'usuarios_administrar']);
});

test('groupPermisosByPrefix agrupa permisos por dominio conocido', () => {
  const groups = groupPermisosByPrefix([
    { id: 3, nombre: 'documentos_ver' },
    { id: 1, nombre: 'acceso_total' },
    { id: 2, nombre: 'usuarios_administrar' },
    { id: 4, nombre: 'reservas_ver' },
  ]);

  assert.deepEqual(groups.map((group) => group.group), [
    'acceso',
    'usuarios',
    'documentos',
    'reservas',
  ]);
  assert.equal(groups[0].label, 'Acceso general');
});

test('buildRoleFormPayload normaliza codigo, jerarquia y permisos', () => {
  assert.deepEqual(buildRoleFormPayload({
    codigo: ' QA_Operativo ',
    nombre: ' QA operativo ',
    descripcion: '  Control ',
    nivel_jerarquia: '45',
    permisos: ['usuarios_administrar', 'usuarios_administrar'],
  }), {
    codigo: 'qa_operativo',
    nombre: 'QA operativo',
    descripcion: 'Control',
    nivel_jerarquia: 45,
    permisos: ['usuarios_administrar'],
  });
});

test('countRolePermissions tolera roles sin permisos', () => {
  assert.equal(countRolePermissions({ permisos: ['documentos_ver', 'documentos_ver'] }), 1);
  assert.equal(countRolePermissions({}), 0);
});
