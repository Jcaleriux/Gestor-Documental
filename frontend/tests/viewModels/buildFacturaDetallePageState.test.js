import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacturaDetallePageState } from '../../src/components/facturaDetalle/viewModels/buildFacturaDetallePageState.js';

const createMeta = (overrides = {}) => ({
  loading: false,
  error: '',
  factura: { id: 101, sociedad_id: 10 },
  ...overrides
});

test('buildFacturaDetallePageState retorna missing_sociedad cuando no hay sociedad seleccionada', () => {
  const pageState = buildFacturaDetallePageState({
    sociedadId: null,
    meta: createMeta()
  });

  assert.equal(pageState.status, 'missing_sociedad');
  assert.equal(pageState.message, 'Seleccione una sociedad para ver el documento.');
});

test('buildFacturaDetallePageState prioriza loading antes que otros estados', () => {
  const pageState = buildFacturaDetallePageState({
    sociedadId: 10,
    meta: createMeta({ loading: true, error: 'x', factura: null })
  });

  assert.equal(pageState.status, 'loading');
  assert.equal(pageState.message, '');
});

test('buildFacturaDetallePageState retorna error cuando meta.error existe', () => {
  const pageState = buildFacturaDetallePageState({
    sociedadId: 10,
    meta: createMeta({ error: 'No se pudo cargar.' })
  });

  assert.equal(pageState.status, 'error');
  assert.equal(pageState.message, 'No se pudo cargar.');
});

test('buildFacturaDetallePageState retorna not_found cuando no existe factura', () => {
  const pageState = buildFacturaDetallePageState({
    sociedadId: 10,
    meta: createMeta({ factura: null })
  });

  assert.equal(pageState.status, 'not_found');
  assert.equal(pageState.message, 'Documento no encontrado.');
});

test('buildFacturaDetallePageState retorna sociedad_mismatch cuando factura pertenece a otra sociedad', () => {
  const pageState = buildFacturaDetallePageState({
    sociedadId: 10,
    meta: createMeta({ factura: { id: 101, sociedad_id: 999 } })
  });

  assert.equal(pageState.status, 'sociedad_mismatch');
  assert.equal(pageState.message, 'El documento no pertenece a la sociedad seleccionada.');
});

test('buildFacturaDetallePageState retorna ready cuando puede mostrarse la pagina', () => {
  const pageState = buildFacturaDetallePageState({
    sociedadId: 10,
    meta: createMeta()
  });

  assert.equal(pageState.status, 'ready');
  assert.equal(pageState.message, '');
});
