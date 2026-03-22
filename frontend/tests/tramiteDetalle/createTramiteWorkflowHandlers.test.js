import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import { createTramiteWorkflowHandlers } from '../../src/hooks/tramiteDetalle/createTramiteWorkflowHandlers.js';

const createDeps = () => ({
  api: {
    decisionDocumento: createMockFn(async () => ({})),
    cambiarEstado: createMockFn(async () => ({})),
    accionTesoreria: createMockFn(async () => ({})),
    uploadCaratulas: createMockFn(async () => ({})),
    resolveCaratulas: createMockFn(async () => ({}))
  },
  promptMotivoFn: createMockFn(() => 'motivo-demo'),
  promptLabels: {
    rechazoMotivo: 'rechazo',
    exclusionMotivo: 'exclusion',
    motivoOpcional: 'opcional'
  },
  alertLabels: {
    decisionSuccess: 'decision-ok',
    decisionError: 'decision-error',
    estadoSuccess: 'estado-ok',
    estadoError: 'estado-error',
    tesoreriaSuccess: 'tesoreria-ok',
    tesoreriaError: 'tesoreria-error',
    tesoreriaDestinoRequired: 'destino-requerido',
    caratulasFileRequired: 'archivo-requerido',
    caratulasUploadSuccess: 'caratulas-ok',
    caratulasUploadError: 'caratulas-error',
    caratulasResolveSuccess: 'resolver-ok',
    caratulasResolveError: 'resolver-error'
  },
  overrideLabels: {
    required: 'override-required'
  }
});

const createWorkflowInputs = () => ({
  id: 88,
  actorUsuario: 'gerencia@novogar.local',
  documentosActivos: [
    { factura_id: 1, total_a_pagar: 100, consecutivo: 'FAC-1' }
  ],
  fetchDetalle: createMockFn(async () => {}),
  setActionMessage: createMockFn(),
  setActionError: createMockFn()
});

const createWorkflowState = () => ({
  overrideEstado: 'en_aprobacion_gerencia_contable',
  overrideMotivo: 'ajuste',
  overrideUser: 'admin',
  setOverrideEstado: createMockFn(),
  setOverrideMotivo: createMockFn(),
  setOverrideError: createMockFn(),
  setUploadingCaratulas: createMockFn(),
  setResolvingCaratulaGroupKey: createMockFn(),
  tesoreriaDestino: { 1: 'en_aprobacion_gerencia' },
  pagosFacturas: { 1: '75.50' }
});

test('createTramiteWorkflowHandlers.handleDecision usa prompt en rechazo y refresca detalle', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState: createWorkflowState(),
    dependencies: deps
  });

  await handlers.handleDecision(1, 'gerencia', 'rechazado');

  assert.equal(deps.promptMotivoFn.calls.length, 1);
  assert.deepEqual(deps.promptMotivoFn.calls[0], ['rechazo']);
  assert.equal(deps.api.decisionDocumento.calls.length, 1);
  assert.deepEqual(deps.api.decisionDocumento.calls[0], [
    88,
    1,
    { etapa: 'gerencia', decision: 'rechazado', motivo: 'motivo-demo', usuario: 'gerencia@novogar.local' }
  ]);
  assert.equal(workflowInputs.fetchDetalle.calls.length, 1);
  assert.deepEqual(workflowInputs.setActionMessage.calls.at(-1), ['decision-ok']);
});

test('createTramiteWorkflowHandlers.handleAccionTesoreria valida destino para reenviar/reincluir', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const workflowState = createWorkflowState();
  workflowState.tesoreriaDestino = {};

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState,
    dependencies: deps
  });

  await handlers.handleAccionTesoreria(1, 'reenviar');

  assert.equal(deps.api.accionTesoreria.calls.length, 0);
  assert.deepEqual(workflowInputs.setActionError.calls.at(-1), ['destino-requerido']);
});

test('createTramiteWorkflowHandlers.handleOverrideEstado aplica cambio forzado y limpia estado local', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const workflowState = createWorkflowState();

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState,
    dependencies: deps
  });

  const preventDefault = createMockFn();
  await handlers.handleOverrideEstado({ preventDefault });

  assert.equal(preventDefault.calls.length, 1);
  assert.equal(deps.api.cambiarEstado.calls.length, 1);
  assert.deepEqual(deps.api.cambiarEstado.calls[0], [
    88,
    {
      estado: 'en_aprobacion_gerencia_contable',
      usuario: 'admin',
      motivo: 'ajuste',
      force: true
    }
  ]);
  assert.deepEqual(workflowState.setOverrideEstado.calls[0], ['']);
  assert.deepEqual(workflowState.setOverrideMotivo.calls[0], ['']);
});

test('createTramiteWorkflowHandlers.handleAccionSiguiente para pagado valida montos y evita cambiar estado si hay error', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const workflowState = createWorkflowState();
  workflowState.pagosFacturas = { 1: '0' };

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState,
    dependencies: deps
  });

  await handlers.handleAccionSiguiente('pagado');

  assert.equal(deps.api.cambiarEstado.calls.length, 0);
  assert.equal(workflowInputs.setActionError.calls.at(-1)[0].includes('Monto invalido'), true);
});

test('createTramiteWorkflowHandlers.handleAccionSiguiente para pagado envía pagos_documentos cuando es válido', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const workflowState = createWorkflowState();
  workflowState.pagosFacturas = { 1: '99.99' };

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState,
    dependencies: deps
  });

  await handlers.handleAccionSiguiente('pagado');

  assert.equal(deps.api.cambiarEstado.calls.length, 1);
  assert.deepEqual(deps.api.cambiarEstado.calls[0], [
    88,
    {
      estado: 'pagado',
      usuario: 'gerencia@novogar.local',
      motivo: null,
      force: false,
      pagos_documentos: [{ factura_id: 1, monto_pago: 99.99 }]
    }
  ]);
});

test('createTramiteWorkflowHandlers.handleResolveCaratulas llama API y refresca detalle', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const workflowState = createWorkflowState();

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState,
    dependencies: deps
  });

  await handlers.handleResolveCaratulas({
    groupKey: 'group_1',
    providerFacturaId: 1,
    lineMatches: [{ line_key: 'line_1', factura_id: 1 }]
  });

  assert.deepEqual(deps.api.resolveCaratulas.calls[0], [
    88,
    {
      group_key: 'group_1',
      provider_factura_id: 1,
      line_matches: [{ line_key: 'line_1', factura_id: 1 }],
      usuario: 'gerencia@novogar.local'
    }
  ]);
  assert.deepEqual(workflowState.setResolvingCaratulaGroupKey.calls[0], ['group_1']);
  assert.deepEqual(workflowState.setResolvingCaratulaGroupKey.calls.at(-1), ['']);
  assert.equal(workflowInputs.fetchDetalle.calls.length, 1);
});
