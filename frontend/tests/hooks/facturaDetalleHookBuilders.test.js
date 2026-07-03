import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  buildFacturaDetalleActionsParams,
  buildFacturaDetalleHookOutput
} from '../../src/hooks/facturaDetalle/facturaDetalleHookBuilders.js';
import { AUTH_TOKEN_KEY } from '../../src/utils/auth.js';

const setLocalStorageMock = ({ token = '' } = {}) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      if (key === AUTH_TOKEN_KEY) return token;
      return null;
    },
    setItem() {},
    removeItem() {}
  };

  return () => {
    globalThis.localStorage = previous;
  };
};

const createDataFixture = () => {
  const noop = createMockFn();

  return {
    factura: {
      id: 101,
      ruta_pdf: 'docs/factura.pdf',
      ruta_xml: 'docs/factura.xml',
      has_mensaje_hacienda: true,
      resumen: { CodigoTipoMoneda: { CodigoMoneda: 'USD' }, TotalComprobante: 1000 }
    },
    comentarios: [],
    estados: [],
    loading: false,
    commentUser: 'admin',
    setCommentUser: noop,
    commentText: '',
    setCommentText: noop,
    estadoNuevo: '',
    setEstadoNuevo: noop,
    estadoUser: 'admin',
    setEstadoUser: noop,
    estadoMotivo: '',
    setEstadoMotivo: noop,
    error: '',
    mhLoading: false,
    mhError: '',
    conta: { proveedor_id: '5', descuento: 0, anticipo_aplicado: 0, monto_nota_credito: 0, retencion: 0, retencion_pagada: 0 },
    proveedoresSociedad: [],
    tablasPagoProveedor: [],
    tablaPagoActual: null,
    tablasModalOpen: false,
    setTablasModalOpen: noop,
    tablasLoading: false,
    tablasError: '',
    ordenesCompraProveedor: [],
    ordenCompraActual: null,
    ordenesModalOpen: false,
    setOrdenesModalOpen: noop,
    ordenesLoading: false,
    ordenesError: '',
    notasCreditoProveedor: [],
    notaCreditoActual: null,
    notasModalOpen: false,
    setNotasModalOpen: noop,
    notasLoading: false,
    notasError: '',
    retencionPagos: [],
    contaSaving: false,
    contaSavingAction: '',
    contaMessage: '',
    contaError: '',
    retencionPagoMonto: '',
    setRetencionPagoMonto: noop,
    retencionPagoFecha: '2026-02-27',
    setRetencionPagoFecha: noop,
    retencionPagoNotas: '',
    setRetencionPagoNotas: noop,
    retencionPagoSaving: false,
    retencionPagoError: '',
    retencionPagoMessage: '',
    fetchAll: noop,
    setComentarios: noop,
    setConta: noop,
    setContaSaving: noop,
    setContaSavingAction: noop,
    setContaMessage: noop,
    setContaError: noop,
    setTablasPagoProveedor: noop,
    setTablaPagoActual: noop,
    setTablasError: noop,
    setTablasLoading: noop,
    setOrdenesCompraProveedor: noop,
    setOrdenCompraActual: noop,
    setOrdenesError: noop,
    setOrdenesLoading: noop,
    setNotasCreditoProveedor: noop,
    setNotaCreditoActual: noop,
    setNotasError: noop,
    setNotasLoading: noop,
    setRetencionPagoSaving: noop,
    setRetencionPagoError: noop,
    setRetencionPagoMessage: noop,
    setMhLoading: noop,
    setMhError: noop
  };
};

const createActionsFixture = () => {
  const noop = createMockFn();
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
    guardarBorrador: noop,
    marcarEnRevision: noop,
    guardarContabilizacion: noop,
    registrarPagoRetencion: noop,
    verMensajeHacienda: noop,
    verManifest: noop
  };
};

test('buildFacturaDetalleActionsParams compone moduleInputs + dependencies', () => {
  const data = createDataFixture();
  const actionDependencies = { facturaApi: { saveContabilizacion: createMockFn() } };

  const params = buildFacturaDetalleActionsParams({
    id: 101,
    data,
    actionDependencies
  });

  assert.equal(params.moduleInputs.commentEstado.id, 101);
  assert.equal(params.moduleInputs.contabilizacion.id, 101);
  assert.equal(params.moduleInputs.document.id, 101);
  assert.equal(params.dependencies, actionDependencies);
});

test('buildFacturaDetalleHookOutput compone contrato seccionado + viewModels cuando existe factura', () => {
  const restore = setLocalStorageMock({ token: 'token-hooks' });
  try {
    const data = createDataFixture();
    const actions = createActionsFixture();

    const output = buildFacturaDetalleHookOutput({
      id: 101,
      data,
      actions,
      selectedSociedadName: 'ASF',
      canEditContabilizacion: true
    });

    assert.equal(output.meta.factura.id, 101);
    assert.equal(output.meta.loading, false);
    assert.equal(output.meta.canEditContabilizacion, true);
    assert.equal(output.state.contabilizacion.conta.proveedor_id, '5');
    assert.equal(output.state.retencion.retencionPagoFecha, '2026-02-27');
    assert.equal(output.actions.addComment, actions.addComment);
    assert.equal(output.viewModels.summary.factura.id, 101);
    assert.equal(output.viewModels.summary.selectedSociedadName, 'ASF');
    assert.equal(output.viewModels.pdf.id, 101);
  } finally {
    restore();
  }
});

test('buildFacturaDetalleHookOutput retorna viewModels null cuando no hay factura', () => {
  const data = createDataFixture();
  data.factura = null;
  const actions = createActionsFixture();

  const output = buildFacturaDetalleHookOutput({
    id: 101,
    data,
    actions,
    selectedSociedadName: '',
    canEditContabilizacion: false
  });

  assert.equal(output.meta.factura, null);
  assert.equal(output.viewModels, null);
});
