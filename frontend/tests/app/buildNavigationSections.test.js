import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNavigationSections } from '../../src/app/buildNavigationSections.js';

test('buildNavigationSections deja visibles solo las secciones base cuando no hay permisos especiales', () => {
  const sections = buildNavigationSections({
    canManageSociedades: false,
    canManageUsers: false,
    canUseOrdenesCompra: false,
    canUseReservas: false,
    canUseTablasPago: false,
    canViewTramites: false,
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ['general', 'compras'],
  );
  assert.deepEqual(
    sections.find((section) => section.id === 'compras')?.items.map((item) => item.id),
    ['facturas', 'retenciones-pendientes', 'notas-credito', 'tiquetes-electronicos'],
  );
});

test('buildNavigationSections agrega secciones habilitadas por permisos sin mezclar items ocultos', () => {
  const sections = buildNavigationSections({
    canManageSociedades: true,
    canManageUsers: true,
    canUseOrdenesCompra: true,
    canUseReservas: true,
    canUseTablasPago: true,
    canViewTramites: true,
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ['general', 'compras', 'tesoreria', 'ventas', 'ingenieria', 'administracion'],
  );
  assert.deepEqual(
    sections.find((section) => section.id === 'tesoreria')?.items.map((item) => item.id),
    ['tramites'],
  );
  assert.deepEqual(
    sections.find((section) => section.id === 'ventas')?.items.map((item) => item.id),
    ['reservas'],
  );
  assert.deepEqual(
    sections.find((section) => section.id === 'ingenieria')?.items.map((item) => item.id),
    ['tablas-pago', 'ordenes-compra'],
  );
  assert.deepEqual(
    sections.find((section) => section.id === 'administracion')?.items.map((item) => item.id),
    ['sociedades', 'usuarios', 'proveedores', 'centros-costo'],
  );
});

test('buildNavigationSections muestra sociedades sin requerir administracion de usuarios', () => {
  const sections = buildNavigationSections({
    canManageSociedades: true,
    canManageUsers: false,
    canUseOrdenesCompra: false,
    canUseReservas: false,
    canUseTablasPago: false,
    canViewTramites: false,
  });

  assert.deepEqual(
    sections.find((section) => section.id === 'administracion')?.items.map((item) => item.id),
    ['sociedades'],
  );
});
