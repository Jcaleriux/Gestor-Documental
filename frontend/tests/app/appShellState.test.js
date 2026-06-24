import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpandedSectionsState,
  buildMobileSidebarOpen,
  buildVisibleExpandedSections,
} from '../../src/app/appShellState.js';

const sections = [
  { id: 'general', label: 'General' },
  { id: 'compras', label: 'Compras' },
];

test('buildExpandedSectionsState completa defaults y conserva preferencias conocidas', () => {
  assert.deepEqual(
    buildExpandedSectionsState(sections, { general: true, desconocida: true }),
    {
      general: true,
      compras: false,
    },
  );
});

test('buildVisibleExpandedSections mantiene cerrada la seccion activa por defecto', () => {
  assert.deepEqual(
    buildVisibleExpandedSections({
      sections,
      storedValue: { general: false, compras: false },
      activeSectionId: 'compras',
      pathname: '/facturas',
      syncedPathname: '/dashboard',
    }),
    {
      general: false,
      compras: false,
    },
  );
});

test('buildVisibleExpandedSections respeta el estado actual cuando ya esta sincronizado', () => {
  assert.deepEqual(
    buildVisibleExpandedSections({
      sections,
      storedValue: { general: false, compras: false },
      activeSectionId: 'compras',
      pathname: '/facturas',
      syncedPathname: '/facturas',
    }),
    {
      general: false,
      compras: false,
    },
  );
});

test('buildMobileSidebarOpen solo mantiene abierto el sidebar en mobile y misma ruta', () => {
  assert.equal(
    buildMobileSidebarOpen({
      isMobileView: true,
      pathname: '/facturas',
      state: { pathname: '/facturas', open: true },
    }),
    true,
  );

  assert.equal(
    buildMobileSidebarOpen({
      isMobileView: false,
      pathname: '/facturas',
      state: { pathname: '/facturas', open: true },
    }),
    false,
  );

  assert.equal(
    buildMobileSidebarOpen({
      isMobileView: true,
      pathname: '/dashboard',
      state: { pathname: '/facturas', open: true },
    }),
    false,
  );
});
