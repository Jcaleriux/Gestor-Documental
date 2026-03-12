import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import { buildTramiteDetalleOutputContract } from '../../src/hooks/tramiteDetalle/tramiteDetalleOutputBuilders.js';

test('buildTramiteDetalleOutputContract expone contrato publico del hook', () => {
  const fetchDetalle = createMockFn();
  const fetchHistorial = createMockFn();
  const setActionMessage = createMockFn();
  const setActionError = createMockFn();

  const state = {
    tramite: { id: 10 },
    documentos: [{ factura_id: 1 }],
    retenciones: [{ id: 5 }],
    loading: false,
    actionMessage: 'ok',
    setActionMessage,
    actionError: '',
    setActionError,
    historial: [{ id: 1 }],
    historialError: '',
    sociedadInfo: { id: 10, nombre_proyecto: 'Sociedad 10' }
  };

  const output = buildTramiteDetalleOutputContract({
    state,
    fetchDetalle,
    fetchHistorial
  });

  assert.equal(output.tramite.id, 10);
  assert.equal(output.documentos.length, 1);
  assert.equal(output.retenciones.length, 1);
  assert.equal(output.actionMessage, 'ok');
  assert.equal(output.setActionMessage, setActionMessage);
  assert.equal(output.fetchDetalle, fetchDetalle);
  assert.equal(output.fetchHistorial, fetchHistorial);
  assert.equal(output.sociedadInfo.nombre_proyecto, 'Sociedad 10');
});
