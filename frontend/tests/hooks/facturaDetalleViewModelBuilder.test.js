import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import { buildFacturaDetalleViewModelOutput } from '../../src/hooks/facturaDetalle/facturaDetalleViewModelBuilder.js';
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

const createDetalleOutputFixture = () => ({
  factura: {
    id: 101,
    resumen: {
      CodigoTipoMoneda: { CodigoMoneda: 'USD' },
      TotalComprobante: 200
    },
    ruta_pdf: 'docs/factura.pdf',
    ruta_xml: 'docs/factura.xml',
    has_mensaje_hacienda: true
  },
  mhLoading: false,
  mhError: '',
  verMensajeHacienda: createMockFn(),
  verManifest: createMockFn(),
  tablaPagoActual: null,
  verTablaPagoAsociada: createMockFn(),
  ordenCompraActual: null,
  verOrdenCompraAsociada: createMockFn(),
  notaCreditoActual: null,
  verNotaCreditoAsociada: createMockFn(),
  conta: {
    descuento: 10,
    anticipo_aplicado: 5,
    monto_nota_credito: 5,
    retencion: 10,
    retencion_pagada: 0
  },
  proveedoresSociedad: [],
  contaSaving: false,
  contaMessage: '',
  contaError: '',
  handleContaChange: createMockFn(),
  guardarContabilizacion: createMockFn(),
  tablasLoading: false,
  ordenesLoading: false,
  notasLoading: false,
  abrirAsociarTablaPago: createMockFn(),
  abrirAsociarOrdenCompra: createMockFn(),
  abrirAsociarNotaCredito: createMockFn(),
  tablasModalOpen: false,
  tablasError: '',
  tablasPagoProveedor: [],
  setTablasModalOpen: createMockFn(),
  asociarTablaPago: createMockFn(),
  notasModalOpen: false,
  notasError: '',
  notasCreditoProveedor: [],
  setNotasModalOpen: createMockFn(),
  asociarNotaCredito: createMockFn(),
  ordenesModalOpen: false,
  ordenesError: '',
  ordenesCompraProveedor: [],
  setOrdenesModalOpen: createMockFn(),
  asociarOrdenCompra: createMockFn(),
  retencionPagoMonto: '',
  setRetencionPagoMonto: createMockFn(),
  retencionPagoFecha: '2026-02-27',
  setRetencionPagoFecha: createMockFn(),
  retencionPagoNotas: '',
  setRetencionPagoNotas: createMockFn(),
  retencionPagoSaving: false,
  retencionPagoError: '',
  retencionPagoMessage: '',
  registrarPagoRetencion: createMockFn(),
  retencionPagos: [],
  estadoUser: 'admin',
  setEstadoUser: createMockFn(),
  estadoNuevo: '',
  setEstadoNuevo: createMockFn(),
  estadoMotivo: '',
  setEstadoMotivo: createMockFn(),
  changeEstado: createMockFn(),
  estados: [],
  commentUser: 'admin',
  setCommentUser: createMockFn(),
  commentText: '',
  setCommentText: createMockFn(),
  addComment: createMockFn(),
  comentarios: []
});

test('buildFacturaDetalleViewModelOutput compone viewModels para summary/pdf/contabilizacion/estado/comentarios', () => {
  const restore = setLocalStorageMock({ token: 'token-abc' });

  try {
    const detalleOutput = createDetalleOutputFixture();
    const viewModels = buildFacturaDetalleViewModelOutput({
      id: 101,
      detalleOutput
    });

    assert.equal(viewModels.summary.factura.id, 101);
    assert.equal(viewModels.summary.monedaFactura, 'USD');
    assert.equal(viewModels.pdf.id, 101);
    assert.equal(viewModels.pdf.pdfUrl, '/api/files/pdf?path=docs%2Ffactura.pdf');
    assert.equal(viewModels.contabilizacion.totals.totalFactura, 200);
    assert.equal(Array.isArray(viewModels.historial.estados), true);
    assert.equal(Array.isArray(viewModels.comentarios.comentarios), true);
  } finally {
    restore();
  }
});
