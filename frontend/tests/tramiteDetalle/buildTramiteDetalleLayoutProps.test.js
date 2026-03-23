import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  buildHeaderLayoutProps,
  buildTableLayoutProps,
  buildTramiteDetalleLayoutProps
} from '../../src/components/tramiteDetalle/viewModels/buildTramiteDetalleLayoutProps.js';

const createBaseInput = () => {
  const noop = createMockFn();

  return {
    headerViewModel: {
      title: 'Tramite #55',
      subtitle: 'Detalle y decisiones del tramite de pago',
      actionsClassName: 'tramite-actions'
    },
    tramite: {
      id: 55,
      estado: 'en_revision_tesoreria_1'
    },
    documentos: [{ factura_id: 1 }],
    documentosActivos: [{ factura_id: 1, ruta_pdf: 'docs/f1.pdf' }],
    caratula: { id: 44, estado: 'requiere_revision', ruta_archivo: 'documentos/tramites/car.pdf' },
    providerGroups: [{ group_key: 'group_1', documents: [{ factura_id: 1 }], lines: [] }],
    retencionesActivas: [{ id: 9 }],
    resumenTotales: { totalDocs: 1, suma: 1000 },
    resumenMoneda: { codigo: 'CRC' },
    accionSiguiente: { estado: 'en_aprobacion_gerencia_contable' },
    handleAccionSiguiente: noop,
    historialVisible: false,
    setHistorialVisible: noop,
    userPermissions: ['documentos_tramitar_pago'],
    activeTab: 'individual',
    setActiveTab: noop,
    actionError: '',
    actionMessage: 'ok',
    historial: [{ id: 1 }],
    historialError: '',
    pagosFacturas: { 1: '1000' },
    handlePagoFacturaChange: noop,
    overrideUser: 'admin',
    overrideEstado: 'pagado',
    overrideMotivo: 'ok',
    overrideError: '',
    setOverrideUser: noop,
    setOverrideEstado: noop,
    setOverrideMotivo: noop,
    handleOverrideEstado: noop,
    tesoreriaDestino: { 1: 'en_aprobacion_gerencia' },
    handleTesoreriaDestinoChange: noop,
    handleDecision: noop,
    handleAccionTesoreria: noop,
    handleUploadCaratulas: noop,
    handleResolveCaratulas: noop,
    uploadingCaratulas: false,
    resolvingCaratulaGroupKey: '',
    sociedadLabel: 'Sociedad 10'
  };
};

test('buildTramiteDetalleLayoutProps agrupa secciones y calcula derivados', () => {
  const input = createBaseInput();
  const layoutProps = buildTramiteDetalleLayoutProps(input);

  assert.equal(layoutProps.header.title, 'Tramite #55');
  assert.equal(layoutProps.header.canExportReport, true);
  assert.equal(layoutProps.tabs.activeTab, 'individual');
  assert.equal(layoutProps.alerts.message, 'ok');
  assert.equal(layoutProps.historial.visible, false);
  assert.equal(layoutProps.meta.tramite.id, 55);
  assert.equal(layoutProps.pagos.visible, true);
  assert.equal(layoutProps.caratulas.caratula.id, 44);
  assert.equal(layoutProps.caratulas.providerGroups.length, 1);
  assert.equal(layoutProps.override.estados.length > 0, true);
  assert.equal(layoutProps.table.documentos.length, 1);
  assert.equal(layoutProps.table.providerGroups.length, 1);
  assert.equal(layoutProps.table.destinosTesoreria.length > 0, true);
  assert.equal(layoutProps.table.permisos.puedeTesoreria, true);

  layoutProps.header.onToggleHistorial();
  assert.equal(input.setHistorialVisible.calls.length, 1);
  assert.equal(typeof input.setHistorialVisible.calls[0][0], 'function');
});

test('buildTramiteDetalleLayoutProps desactiva pagos cuando no aplica etapa de caratulas', () => {
  const input = createBaseInput();
  input.accionSiguiente = { estado: 'pagado' };
  input.documentosActivos = [];

  const layoutProps = buildTramiteDetalleLayoutProps(input);

  assert.equal(layoutProps.pagos.visible, false);
});

test('buildTramiteDetalleLayoutProps expone el estado del reporte para el header y las alertas', () => {
  const input = createBaseInput();
  input.reportLoading = true;
  input.reportError = 'No se pudo generar el reporte.';
  input.reportMessage = 'Reporte generado.';
  input.exportReport = createMockFn();

  const layoutProps = buildTramiteDetalleLayoutProps(input);

  assert.equal(layoutProps.header.exportReportLoading, true);
  assert.equal(typeof layoutProps.header.onExportReport, 'function');
  assert.equal(layoutProps.alerts.reportError, 'No se pudo generar el reporte.');
  assert.equal(layoutProps.alerts.reportMessage, 'Reporte generado.');
});

test('buildHeaderLayoutProps conserva header y wiring de acciones', () => {
  const input = createBaseInput();
  const header = buildHeaderLayoutProps(input);

  assert.equal(header.title, 'Tramite #55');
  assert.equal(header.accionSiguiente, null);
  assert.equal(typeof header.onAccionSiguiente, 'function');
});

test('buildTableLayoutProps calcula permisos y conserva datos de tabla', () => {
  const input = createBaseInput();
  const table = buildTableLayoutProps(input);

  assert.equal(table.activeTab, 'individual');
  assert.equal(table.permisos.puedeTesoreria, true);
  assert.equal(table.destinosTesoreria.length > 0, true);
  assert.equal(table.labelsDocumentos.emptyActivos, 'No hay documentos activos en el tramite.');
  assert.equal(table.labelsUnificada.expandAllPdfs, 'Expandir todos los PDFs');
  assert.equal(table.labelsUnificada.collapseAllPdfs, 'Ocultar todos los PDFs');
});

test('buildTramiteDetalleLayoutProps expone readiness de caratulas para tesoreria en gerencia', () => {
  const input = createBaseInput();
  input.tramite = {
    id: 55,
    estado: 'en_aprobacion_gerencia'
  };
  input.documentosActivos = [
    { factura_id: 1, consecutivo: '001', estado_gerencia: 'aprobado' },
    { factura_id: 2, consecutivo: '002', estado_gerencia: 'pendiente' },
  ];
  input.caratula = null;
  input.providerGroups = [];

  const layoutProps = buildTramiteDetalleLayoutProps(input);

  assert.equal(layoutProps.caratulas.readiness.canManageCaratulas, true);
  assert.equal(layoutProps.caratulas.readiness.showWaitingMessage, true);
  assert.equal(layoutProps.caratulas.readiness.gerenciaAprobados, 1);
  assert.equal(layoutProps.caratulas.readiness.gerenciaPendientes, 1);
  assert.deepEqual(layoutProps.caratulas.readiness.pendingDocuments, ['002']);
});
