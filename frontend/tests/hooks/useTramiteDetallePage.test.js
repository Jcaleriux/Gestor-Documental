import test from 'node:test';
import assert from 'node:assert/strict';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';
import { useTramiteDetallePage } from '../../src/hooks/tramiteDetalle/useTramiteDetallePage.js';

const useTramiteDetallePageHarness = (props) => useTramiteDetallePage(props);

const createWorkflowOutput = () => {
  const noop = createMockFn();

  return {
    historialVisible: false,
    setHistorialVisible: noop,
    overrideEstado: 'pagado',
    setOverrideEstado: noop,
    overrideMotivo: 'ok',
    setOverrideMotivo: noop,
    overrideUser: 'admin',
    setOverrideUser: noop,
    overrideError: '',
    tesoreriaDestino: { 1: 'en_aprobacion_gerencia' },
    pagosFacturas: { 1: '1000' },
    uploadingCaratulas: false,
    resolvingCaratulaGroupKey: '',
    activeTab: 'individual',
    setActiveTab: noop,
    accionSiguiente: { estado: 'pagado' },
    handleDecision: noop,
    handleAccionTesoreria: noop,
    handleUploadCaratulas: noop,
    handleResolveCaratulas: noop,
    handleOverrideEstado: noop,
    handleTesoreriaDestinoChange: noop,
    handlePagoFacturaChange: noop,
    handleAccionSiguiente: noop,
  };
};

test('useTramiteDetallePage orquesta detalle, resumen y workflow en un solo contrato de pagina', async () => {
  const setActionMessage = createMockFn();
  const setActionError = createMockFn();
  const fetchDetalle = createMockFn();
  const fetchHistorial = createMockFn();
  const useWorkflowActionsHook = createMockFn(() => createWorkflowOutput());

  const hook = createHookHarness({
    hook: useTramiteDetallePageHarness,
    initialProps: {
      sociedadId: 10,
      authUser: { email: 'tesoreria@novogar.local' },
      userPermissions: ['documentos_tramitar_pago'],
      dependencies: {
        useParamsHook: () => ({ id: '55' }),
        useDetalleHook: createMockFn(() => ({
          tramite: { id: 55, estado: 'en_revision_tesoreria' },
          documentos: [{ factura_id: 1 }],
          retenciones: [{ id: 9 }],
          caratula: { id: 99, estado: 'procesada' },
          providerGroups: [{ group_key: 'group_1', documents: [{ factura_id: 1 }], lines: [] }],
          loading: false,
          actionMessage: 'ok',
          setActionMessage,
          actionError: '',
          setActionError,
          historial: [{ id: 1 }],
          historialError: '',
          fetchDetalle,
          fetchHistorial,
          sociedadInfo: { nombre_proyecto: 'Sociedad 10' },
        })),
        useResumenHook: createMockFn(() => ({
          documentosActivos: [{ factura_id: 1, ruta_pdf: 'docs/f1.pdf' }],
          retencionesActivas: [{ id: 9 }],
          resumenTotales: { totalDocs: 1, suma: 1000 },
          resumenMoneda: 'CRC: 1,000.00',
        })),
        useWorkflowActionsHook,
      },
    },
  });

  await hook.flush({ cycles: 3 });

  const workflowInputs = useWorkflowActionsHook.calls[0][0].workflowInputs;
  assert.equal(workflowInputs.id, '55');
  assert.equal(workflowInputs.actorUsuario, 'tesoreria@novogar.local');
  assert.equal(workflowInputs.fetchDetalle, fetchDetalle);
  assert.equal(workflowInputs.fetchHistorial, fetchHistorial);
  assert.equal(workflowInputs.setActionMessage, setActionMessage);
  assert.equal(workflowInputs.setActionError, setActionError);

  assert.equal(hook.result.pageState.status, 'ready');
  assert.equal(hook.result.layoutProps.header.title, 'Tramite #55');
  assert.equal(hook.result.layoutProps.table.sociedadLabel, 'Sociedad 10');
});
