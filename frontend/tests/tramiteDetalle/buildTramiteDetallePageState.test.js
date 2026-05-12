import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTramiteDetallePageState } from '../../src/components/tramiteDetalle/viewModels/buildTramiteDetallePageState.js';

test('buildTramiteDetallePageState retorna missing_sociedad cuando falta sociedad', () => {
  const state = buildTramiteDetallePageState({
    sociedadId: null,
    loading: false,
    tramite: { id: 1 }
  });

  assert.equal(state.status, 'missing_sociedad');
  assert.equal(state.message, 'Seleccione una sociedad para ver el tramite.');
});

test('buildTramiteDetallePageState retorna loading cuando sigue cargando', () => {
  const state = buildTramiteDetallePageState({
    sociedadId: 10,
    loading: true,
    tramite: null
  });

  assert.equal(state.status, 'loading');
  assert.equal(state.message, '');
});

test('buildTramiteDetallePageState retorna not_found cuando no hay tramite', () => {
  const state = buildTramiteDetallePageState({
    sociedadId: 10,
    loading: false,
    tramite: null
  });

  assert.equal(state.status, 'not_found');
  assert.equal(state.message, 'No se encontro el tramite.');
});

test('buildTramiteDetallePageState retorna load_error cuando falla la carga inicial', () => {
  const state = buildTramiteDetallePageState({
    sociedadId: 10,
    loading: false,
    tramite: null,
    actionError: 'No se pudo cargar el tramite.'
  });

  assert.equal(state.status, 'load_error');
  assert.equal(state.message, 'No se pudo cargar el tramite.');
});

test('buildTramiteDetallePageState retorna ready cuando hay contexto completo', () => {
  const state = buildTramiteDetallePageState({
    sociedadId: 10,
    loading: false,
    tramite: { id: 44 }
  });

  assert.equal(state.status, 'ready');
  assert.equal(state.message, '');
});
