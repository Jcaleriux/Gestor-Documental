import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  normalizeTramiteWorkflowInputs,
  buildTramiteWorkflowStateInputs,
  buildTramiteWorkflowActionsOutput
} from '../../src/hooks/tramiteDetalle/tramiteWorkflowActionBuilders.js';

test('normalizeTramiteWorkflowInputs prioriza workflowInputs cuando existe', () => {
  const workflowInputs = { id: 10, tramite: { id: 10 } };
  const result = normalizeTramiteWorkflowInputs({
    workflowInputs,
    id: 20
  });

  assert.equal(result, workflowInputs);
  assert.equal(result.id, 10);
});

test('normalizeTramiteWorkflowInputs construye contrato desde inputs legacy', () => {
  const fetchDetalle = createMockFn();
  const fetchHistorial = createMockFn();
  const setActionMessage = createMockFn();
  const setActionError = createMockFn();

  const result = normalizeTramiteWorkflowInputs({
    id: 55,
    tramite: { id: 55 },
    documentosActivos: [{ factura_id: 1 }],
    fetchDetalle,
    fetchHistorial,
    setActionMessage,
    setActionError
  });

  assert.equal(result.id, 55);
  assert.equal(result.tramite.id, 55);
  assert.equal(result.documentosActivos.length, 1);
  assert.equal(result.fetchDetalle, fetchDetalle);
  assert.equal(result.fetchHistorial, fetchHistorial);
  assert.equal(result.setActionMessage, setActionMessage);
  assert.equal(result.setActionError, setActionError);
});

test('buildTramiteWorkflowStateInputs toma solo campos necesarios para state hook', () => {
  const inputs = {
    id: 70,
    tramite: { id: 70 },
    documentosActivos: [{ factura_id: 2 }],
    actorUsuario: 'gerencia@sendadocs.local',
    fetchHistorial: createMockFn(),
    fetchDetalle: createMockFn()
  };

  const stateInputs = buildTramiteWorkflowStateInputs(inputs);

  assert.deepEqual(Object.keys(stateInputs), ['id', 'tramite', 'documentosActivos', 'actorUsuario', 'fetchHistorial']);
  assert.equal(stateInputs.id, 70);
  assert.equal(stateInputs.documentosActivos.length, 1);
  assert.equal(stateInputs.actorUsuario, 'gerencia@sendadocs.local');
});

test('buildTramiteWorkflowActionsOutput compone salida publica desde state y handlers', () => {
  const workflowState = {
    historialVisible: false,
    setHistorialVisible: createMockFn(),
    overrideEstado: '',
    setOverrideEstado: createMockFn(),
    overrideMotivo: '',
    setOverrideMotivo: createMockFn(),
    overrideUser: 'admin',
    setOverrideUser: createMockFn(),
    overrideError: '',
    tesoreriaDestino: { 1: 'en_aprobacion_gerencia' },
    pagosFacturas: { 1: '1000' },
    activeTab: 'individual',
    setActiveTab: createMockFn(),
    accionSiguiente: { estado: 'pagado' },
    handleTesoreriaDestinoChange: createMockFn(),
    handlePagoFacturaChange: createMockFn()
  };

  const handlers = {
    handleDecision: createMockFn(),
    handleAccionTesoreria: createMockFn(),
    handleOverrideEstado: createMockFn(),
    handleAccionSiguiente: createMockFn()
  };

  const output = buildTramiteWorkflowActionsOutput({ workflowState, handlers });

  assert.equal(output.activeTab, 'individual');
  assert.equal(output.handleDecision, handlers.handleDecision);
  assert.equal(output.handleAccionSiguiente, handlers.handleAccionSiguiente);
  assert.equal(output.handlePagoFacturaChange, workflowState.handlePagoFacturaChange);
  assert.equal(output.tesoreriaDestino[1], 'en_aprobacion_gerencia');
});
