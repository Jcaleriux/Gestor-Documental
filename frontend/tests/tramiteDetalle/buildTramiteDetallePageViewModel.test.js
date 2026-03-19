import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  buildSociedadLabel,
  buildTramiteWorkflowInputs,
  buildTramiteDetallePageViewModel,
} from '../../src/components/tramiteDetalle/viewModels/buildTramiteDetallePageViewModel.js';

const createWorkflow = () => {
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
    activeTab: 'individual',
    setActiveTab: noop,
    accionSiguiente: { estado: 'pagado' },
    handleDecision: noop,
    handleAccionTesoreria: noop,
    handleOverrideEstado: noop,
    handleTesoreriaDestinoChange: noop,
    handlePagoFacturaChange: noop,
    handleAccionSiguiente: noop,
  };
};

test('buildTramiteWorkflowInputs arma actor y callbacks base del workflow', () => {
  const fetchDetalle = createMockFn();
  const fetchHistorial = createMockFn();
  const setActionMessage = createMockFn();
  const setActionError = createMockFn();

  const workflowInputs = buildTramiteWorkflowInputs({
    id: '55',
    tramite: { id: 55 },
    documentosActivos: [{ factura_id: 1 }],
    authUser: { email: 'tesoreria@novogar.local' },
    fetchDetalle,
    fetchHistorial,
    setActionMessage,
    setActionError,
  });

  assert.equal(workflowInputs.actorUsuario, 'tesoreria@novogar.local');
  assert.equal(workflowInputs.id, '55');
  assert.equal(workflowInputs.documentosActivos.length, 1);
  assert.equal(workflowInputs.fetchDetalle, fetchDetalle);
});

test('buildSociedadLabel prioriza nombre de proyecto y luego fallback', () => {
  assert.equal(
    buildSociedadLabel({
      sociedadInfo: { nombre_proyecto: 'Sociedad 8' },
      sociedadId: 8,
    }),
    'Sociedad 8',
  );

  assert.equal(
    buildSociedadLabel({
      sociedadInfo: null,
      sociedadId: 12,
    }),
    12,
  );
});

test('buildTramiteDetallePageViewModel retorna layoutProps cuando la pagina esta lista', () => {
  const viewModel = buildTramiteDetallePageViewModel({
    id: '55',
    sociedadId: 10,
    detalle: {
      tramite: { id: 55, estado: 'en_revision_tesoreria' },
      documentos: [{ factura_id: 1 }],
      retenciones: [{ id: 9 }],
      loading: false,
      actionMessage: 'ok',
      actionError: '',
      historial: [{ id: 1 }],
      historialError: '',
      sociedadInfo: { nombre_proyecto: 'Sociedad 10' },
    },
    documentosActivos: [{ factura_id: 1, ruta_pdf: 'docs/f1.pdf' }],
    retencionesActivas: [{ id: 9 }],
    resumenTotales: { totalDocs: 1, suma: 1000 },
    resumenMoneda: 'CRC: 1,000.00',
    workflow: createWorkflow(),
    userPermissions: ['documentos_tramitar_pago'],
  });

  assert.equal(viewModel.pageState.status, 'ready');
  assert.equal(viewModel.layoutProps.header.title, 'Tramite #55');
  assert.equal(viewModel.layoutProps.table.sociedadLabel, 'Sociedad 10');
  assert.equal(viewModel.layoutProps.pagos.visible, true);
});

test('buildTramiteDetallePageViewModel evita layoutProps cuando la pagina no esta lista', () => {
  const viewModel = buildTramiteDetallePageViewModel({
    id: '55',
    sociedadId: null,
    detalle: {
      tramite: { id: 55, estado: 'en_revision_tesoreria' },
      documentos: [],
      retenciones: [],
      loading: false,
      actionMessage: '',
      actionError: '',
      historial: [],
      historialError: '',
      sociedadInfo: null,
    },
    documentosActivos: [],
    retencionesActivas: [],
    resumenTotales: { totalDocs: 0, suma: 0 },
    resumenMoneda: '',
    workflow: createWorkflow(),
    userPermissions: [],
  });

  assert.equal(viewModel.pageState.status, 'missing_sociedad');
  assert.equal(viewModel.layoutProps, null);
});
