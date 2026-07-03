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
    resolveCaratulas: createMockFn(async () => ({})),
    confirmProviderCaratulaOrder: createMockFn(async () => ({})),
    uploadProviderCaratula: createMockFn(async () => ({})),
    confirmProviderCaratula: createMockFn(async () => ({})),
    assignOrphanCaratula: createMockFn(async () => ({})),
    discardOrphanCaratula: createMockFn(async () => ({}))
  },
  promptMotivoFn: createMockFn(() => 'motivo-demo'),
  promptLabels: {
    rechazoMotivo: 'rechazo',
    exclusionMotivo: 'exclusion',
    devolucionContabilidadMotivo: 'devolucion-contabilidad',
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
    tesoreriaMotivoRequired: 'motivo-requerido',
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
  actorUsuario: 'gerencia@sendadocs.local',
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
  setUploadingProviderKey: createMockFn(),
  setConfirmingProviderKey: createMockFn(),
  setConfirmingOrderProviderKey: createMockFn(),
  setOrphanActionId: createMockFn(),
  tesoreriaDestino: { 1: 'en_aprobacion_gerencia' },
  pagosFacturas: { 1: '75.50' }
});

const createFileReaderStub = () => {
  const previousFileReader = globalThis.FileReader;
  globalThis.FileReader = class {
    readAsDataURL(file) {
      this.result = `data:${file.type || 'application/pdf'};base64,${file.base64 || 'Y2FyYXR1bGE='}`;
      this.onload();
    }
  };

  return () => {
    globalThis.FileReader = previousFileReader;
  };
};

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
    { etapa: 'gerencia', decision: 'rechazado', motivo: 'motivo-demo', usuario: 'gerencia@sendadocs.local' }
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

test('createTramiteWorkflowHandlers.handleAccionTesoreria exige motivo al devolver a contabilidad', async () => {
  const deps = createDeps();
  deps.promptMotivoFn = createMockFn(() => '   ');
  const workflowInputs = createWorkflowInputs();

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState: createWorkflowState(),
    dependencies: deps
  });

  await handlers.handleAccionTesoreria(1, 'devolver_contabilidad');

  assert.equal(deps.api.accionTesoreria.calls.length, 0);
  assert.deepEqual(deps.promptMotivoFn.calls[0], ['devolucion-contabilidad']);
  assert.deepEqual(workflowInputs.setActionError.calls.at(-1), ['motivo-requerido']);
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

test('createTramiteWorkflowHandlers.handleAccionSiguiente cambia estado simple sin pagos', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState: createWorkflowState(),
    dependencies: deps
  });

  await handlers.handleAccionSiguiente('en_revision_tesoreria');

  assert.deepEqual(deps.api.cambiarEstado.calls[0], [
    88,
    {
      estado: 'en_revision_tesoreria',
      usuario: 'gerencia@sendadocs.local',
      motivo: null,
      force: false
    }
  ]);
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
      usuario: 'gerencia@sendadocs.local',
      motivo: null,
      force: false,
      pagos_documentos: [{ factura_id: 1, monto_pago: 99.99 }]
    }
  ]);
});

test('createTramiteWorkflowHandlers.handleAccionSiguiente para gerencia contable envÃ­a pagos_documentos cuando es vÃ¡lido', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  const workflowState = createWorkflowState();
  workflowState.pagosFacturas = { 1: '88.25' };

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState,
    dependencies: deps
  });

  await handlers.handleAccionSiguiente('en_aprobacion_gerencia_contable');

  assert.equal(deps.api.cambiarEstado.calls.length, 1);
  assert.deepEqual(deps.api.cambiarEstado.calls[0], [
    88,
    {
      estado: 'en_aprobacion_gerencia_contable',
      usuario: 'gerencia@sendadocs.local',
      motivo: null,
      force: false,
      pagos_documentos: [{ factura_id: 1, monto_pago: 88.25 }]
    }
  ]);
});

test('createTramiteWorkflowHandlers tolera redondeo visible del saldo y envía el pendiente real', async () => {
  const deps = createDeps();
  const workflowInputs = createWorkflowInputs();
  workflowInputs.documentosActivos = [
    { factura_id: 1, total_a_pagar: 404351.99964, consecutivo: '00200009010000167438' }
  ];
  const workflowState = createWorkflowState();
  workflowState.pagosFacturas = { 1: '404352.00' };

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState,
    dependencies: deps
  });

  await handlers.handleAccionSiguiente('pagado');

  assert.deepEqual(workflowInputs.setActionError.calls[0], ['']);
  assert.deepEqual(deps.api.cambiarEstado.calls[0], [
    88,
    {
      estado: 'pagado',
      usuario: 'gerencia@sendadocs.local',
      motivo: null,
      force: false,
      pagos_documentos: [{ factura_id: 1, monto_pago: 404351.9996 }]
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
      usuario: 'gerencia@sendadocs.local'
    }
  ]);
  assert.deepEqual(workflowState.setResolvingCaratulaGroupKey.calls[0], ['group_1']);
  assert.deepEqual(workflowState.setResolvingCaratulaGroupKey.calls.at(-1), ['']);
  assert.equal(workflowInputs.fetchDetalle.calls.length, 1);
});

test('createTramiteWorkflowHandlers maneja carga y confirmaciones de caratulas por proveedor', async () => {
  const restoreFileReader = createFileReaderStub();
  try {
    const deps = createDeps();
    const workflowInputs = createWorkflowInputs();
    const workflowState = createWorkflowState();

    const handlers = createTramiteWorkflowHandlers({
      workflowInputs,
      workflowState,
      dependencies: deps
    });

    assert.equal(await handlers.handleUploadCaratulas(null), false);
    assert.deepEqual(workflowInputs.setActionError.calls.at(-1), ['archivo-requerido']);

    assert.equal(await handlers.handleUploadCaratulas({ name: 'caratulas.pdf', type: 'application/pdf' }), true);
    assert.deepEqual(deps.api.uploadCaratulas.calls.at(-1), [
      88,
      {
        filename: 'caratulas.pdf',
        file_base64: 'Y2FyYXR1bGE=',
        usuario: 'gerencia@sendadocs.local'
      }
    ]);
    assert.deepEqual(workflowState.setUploadingCaratulas.calls, [[true], [false]]);

    assert.equal(await handlers.handleConfirmProviderOrder({
      providerKey: 'prov-1',
      facturaIds: [3, 2, 1],
      orderSource: 'visible'
    }), true);
    assert.deepEqual(deps.api.confirmProviderCaratulaOrder.calls.at(-1), [
      88,
      'prov-1',
      {
        factura_ids: [3, 2, 1],
        order_source: 'visible',
        usuario: 'gerencia@sendadocs.local'
      }
    ]);
    assert.deepEqual(workflowState.setConfirmingOrderProviderKey.calls.at(-1), ['']);

    assert.equal(await handlers.handleUploadProviderCaratula({
      providerKey: 'prov-1',
      file: { name: 'proveedor.pdf', type: 'application/pdf' }
    }), true);
    assert.deepEqual(deps.api.uploadProviderCaratula.calls.at(-1), [
      88,
      'prov-1',
      {
        filename: 'proveedor.pdf',
        file_base64: 'Y2FyYXR1bGE=',
        usuario: 'gerencia@sendadocs.local'
      }
    ]);
    assert.deepEqual(workflowState.setUploadingProviderKey.calls.at(-1), ['']);

    assert.equal(await handlers.handleConfirmProviderCaratula({ providerKey: 'prov-1' }), true);
    assert.deepEqual(deps.api.confirmProviderCaratula.calls.at(-1), [
      88,
      'prov-1',
      { usuario: 'gerencia@sendadocs.local' }
    ]);

    assert.equal(await handlers.handleAssignOrphanCaratula({ orphanId: 55, providerKey: 'prov-1' }), true);
    assert.deepEqual(deps.api.assignOrphanCaratula.calls.at(-1), [
      88,
      55,
      {
        provider_key: 'prov-1',
        usuario: 'gerencia@sendadocs.local'
      }
    ]);

    assert.equal(await handlers.handleDiscardOrphanCaratula({ orphanId: 56 }), true);
    assert.deepEqual(deps.api.discardOrphanCaratula.calls.at(-1), [
      88,
      56,
      { usuario: 'gerencia@sendadocs.local' }
    ]);
    assert.deepEqual(workflowState.setOrphanActionId.calls.at(-1), ['']);
  } finally {
    restoreFileReader();
  }
});

test('createTramiteWorkflowHandlers propaga errores API con mensajes de fallback o backend', async () => {
  const deps = createDeps();
  deps.api.decisionDocumento = createMockFn(async () => {
    throw new Error('fallo sin response');
  });
  deps.api.confirmProviderCaratula = createMockFn(async () => {
    const error = new Error('backend');
    error.response = { data: { error: 'error backend provider' } };
    throw error;
  });
  const workflowInputs = createWorkflowInputs();

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs,
    workflowState: createWorkflowState(),
    dependencies: deps
  });

  await handlers.handleDecision(1, 'gerencia', 'aprobado');
  assert.deepEqual(workflowInputs.setActionError.calls.at(-1), ['decision-error']);

  assert.equal(await handlers.handleConfirmProviderCaratula({ providerKey: 'prov-error' }), false);
  assert.deepEqual(workflowInputs.setActionError.calls.at(-1), ['error backend provider']);
});
