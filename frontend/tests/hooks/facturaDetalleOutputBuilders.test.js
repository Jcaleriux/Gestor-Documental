import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacturaDetalleMetaOutput,
  buildFacturaDetalleGeneralStateOutput,
  buildFacturaDetalleContabilizacionStateOutput,
  buildFacturaDetalleRetencionStateOutput,
  buildFacturaDetalleActionsOutput,
  buildFacturaDetalleOutputContract,
  buildFacturaDetalleViewModelInput
} from '../../src/hooks/facturaDetalle/facturaDetalleOutputBuilders.js';

const createDataFixture = () => {
  const noop = () => {};
  return {
    factura: { id: 100 },
    comentarios: [{ id: 1 }],
    estados: [{ id: 2 }],
    loading: false,
    commentUser: 'admin',
    setCommentUser: noop,
    commentText: 'comentario',
    setCommentText: noop,
    estadoNuevo: 'contabilizado',
    setEstadoNuevo: noop,
    estadoUser: 'admin',
    setEstadoUser: noop,
    estadoMotivo: 'motivo',
    setEstadoMotivo: noop,
    error: '',
    mhLoading: false,
    mhError: '',
    conta: { proveedor_id: '5' },
    proveedoresSociedad: [{ id: 5 }],
    tablasPagoProveedor: [{ id: 7 }],
    tablaPagoActual: { id: 7 },
    tablasModalOpen: false,
    setTablasModalOpen: noop,
    tablasLoading: false,
    tablasError: '',
    ordenesCompraProveedor: [{ id: 8 }],
    ordenCompraActual: { id: 8 },
    ordenesModalOpen: false,
    setOrdenesModalOpen: noop,
    ordenesLoading: false,
    ordenesError: '',
    notasCreditoProveedor: [{ id: 9 }],
    notaCreditoActual: { id: 9 },
    notasModalOpen: false,
    setNotasModalOpen: noop,
    notasLoading: false,
    notasError: '',
    contaSaving: false,
    contaMessage: '',
    contaError: '',
    retencionPagos: [{ id: 10 }],
    retencionPagoMonto: '100',
    setRetencionPagoMonto: noop,
    retencionPagoFecha: '2026-02-27',
    setRetencionPagoFecha: noop,
    retencionPagoNotas: 'nota',
    setRetencionPagoNotas: noop,
    retencionPagoSaving: false,
    retencionPagoError: '',
    retencionPagoMessage: ''
  };
};

const createActionsFixture = () => {
  const noop = () => {};
  return {
    addComment: noop,
    changeEstado: noop,
    handleContaChange: noop,
    abrirAsociarTablaPago: noop,
    asociarTablaPago: noop,
    abrirAsociarOrdenCompra: noop,
    asociarOrdenCompra: noop,
    abrirAsociarNotaCredito: noop,
    asociarNotaCredito: noop,
    verTablaPagoAsociada: noop,
    verOrdenCompraAsociada: noop,
    verNotaCreditoAsociada: noop,
    guardarContabilizacion: noop,
    registrarPagoRetencion: noop,
    verMensajeHacienda: noop,
    verManifest: noop
  };
};

test('buildFacturaDetalleMetaOutput conserva datos de lectura del detalle', () => {
  const data = createDataFixture();
  const output = buildFacturaDetalleMetaOutput(data);

  assert.equal(output.factura.id, 100);
  assert.equal(output.comentarios.length, 1);
  assert.equal(output.estados.length, 1);
  assert.equal(output.loading, false);
});

test('buildFacturaDetalle*StateOutput conserva contratos por seccion', () => {
  const data = createDataFixture();
  const generalOutput = buildFacturaDetalleGeneralStateOutput(data);
  const contaOutput = buildFacturaDetalleContabilizacionStateOutput(data);
  const retencionOutput = buildFacturaDetalleRetencionStateOutput(data);

  assert.equal(generalOutput.commentText, 'comentario');
  assert.equal(generalOutput.setEstadoMotivo, data.setEstadoMotivo);

  assert.equal(contaOutput.conta.proveedor_id, '5');
  assert.equal(contaOutput.setOrdenesModalOpen, data.setOrdenesModalOpen);

  assert.equal(retencionOutput.retencionPagoMonto, '100');
  assert.equal(retencionOutput.setRetencionPagoFecha, data.setRetencionPagoFecha);
});

test('buildFacturaDetalleActionsOutput conserva handlers de acciones', () => {
  const actions = createActionsFixture();
  const output = buildFacturaDetalleActionsOutput(actions);

  assert.equal(output.addComment, actions.addComment);
  assert.equal(output.guardarContabilizacion, actions.guardarContabilizacion);
  assert.equal(output.verManifest, actions.verManifest);
});

test('buildFacturaDetalleOutputContract compone contrato por secciones', () => {
  const data = createDataFixture();
  const actions = createActionsFixture();
  const output = buildFacturaDetalleOutputContract({ data, actions });

  assert.equal(output.meta.factura.id, 100);
  assert.equal(output.state.contabilizacion.conta.proveedor_id, '5');
  assert.equal(output.state.retencion.retencionPagoFecha, '2026-02-27');
  assert.equal(output.actions.verMensajeHacienda, actions.verMensajeHacienda);
});

test('buildFacturaDetalleViewModelInput aplana contrato seccionado para builders de vista', () => {
  const data = createDataFixture();
  const actions = createActionsFixture();
  const output = buildFacturaDetalleOutputContract({ data, actions });
  const viewModelInput = buildFacturaDetalleViewModelInput(output);

  assert.equal(viewModelInput.factura.id, 100);
  assert.equal(viewModelInput.conta.proveedor_id, '5');
  assert.equal(viewModelInput.retencionPagoFecha, '2026-02-27');
  assert.equal(viewModelInput.verManifest, actions.verManifest);
});
