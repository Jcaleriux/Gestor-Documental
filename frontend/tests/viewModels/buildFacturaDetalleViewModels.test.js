import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import { buildFacturaDetalleViewModels } from '../../src/components/facturaDetalle/viewModels/buildFacturaDetalleViewModels.js';
import {
  buildSummarySectionViewModel,
  buildPdfSectionViewModel,
  buildContabilizacionSectionViewModel,
  buildEstadoComentariosSectionViewModels
} from '../../src/components/facturaDetalle/viewModels/buildFacturaDetalleViewModelSections.js';

const setLocalStorageMock = ({ token = '' } = {}) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      if (key === 'novogar_auth_token') return token;
      return null;
    },
    setItem() {},
    removeItem() {}
  };
  return () => {
    globalThis.localStorage = previous;
  };
};

const createDetalleFixture = () => ({
  mhLoading: false,
  mhError: '',
  verMensajeHacienda: createMockFn(),
  verManifest: createMockFn(),
  tablaPagoActual: { id: 11, nombre: 'Tabla', ruta_pdf: 'docs/tabla.pdf' },
  verTablaPagoAsociada: createMockFn(),
  ordenCompraActual: { id: 21, nombre: 'OC', ruta_pdf: 'docs/oc.pdf' },
  verOrdenCompraAsociada: createMockFn(),
  notaCreditoActual: { id: 31, clave: 'NC-31', ruta_pdf: 'docs/nc.pdf', ruta_xml: 'docs/nc.xml' },
  verNotaCreditoAsociada: createMockFn(),
  conta: {
    descuento: 100,
    anticipo_aplicado: 50,
    monto_nota_credito: 25,
    retencion: 75,
    retencion_pagada: 25
  },
  proveedoresSociedad: [{ id: 5, nombre: 'Proveedor X' }],
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
  tablasModalOpen: true,
  tablasError: '',
  tablasPagoProveedor: [{ id: 11, nombre: 'Tabla' }],
  setTablasModalOpen: createMockFn(),
  asociarTablaPago: createMockFn(),
  notasModalOpen: false,
  notasError: '',
  notasCreditoProveedor: [{ id: 31, clave: 'NC-31' }],
  setNotasModalOpen: createMockFn(),
  asociarNotaCredito: createMockFn(),
  ordenesModalOpen: false,
  ordenesError: '',
  ordenesCompraProveedor: [{ id: 21, nombre: 'OC', moneda: 'USD', monto_disponible: 10 }],
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
  estadoNuevo: 'contabilizado',
  setEstadoNuevo: createMockFn(),
  estadoMotivo: '',
  setEstadoMotivo: createMockFn(),
  changeEstado: createMockFn(),
  estados: [{ id: 1, estado_nuevo: 'en_revision' }],
  commentUser: 'admin',
  setCommentUser: createMockFn(),
  commentText: 'nota',
  setCommentText: createMockFn(),
  addComment: createMockFn(),
  comentarios: [{ id: 1, texto: 'ok' }]
});

test('buildFacturaDetalleViewModels compone summary/pdf/contabilizacion/estado/comentarios', () => {
  const restore = setLocalStorageMock({ token: 'token-xyz' });
  try {
    const factura = {
      id: 101,
      ruta_pdf: 'docs/factura.pdf',
      ruta_xml: 'docs/factura.xml',
      has_mensaje_hacienda: true,
      resumen: { CodigoTipoMoneda: { CodigoMoneda: 'USD' }, TotalComprobante: 1000 }
    };
    const detalle = createDetalleFixture();

    const viewModels = buildFacturaDetalleViewModels({ id: 101, factura, detalle });

    assert.equal(viewModels.summary.factura.id, 101);
    assert.equal(viewModels.summary.monedaFactura, 'USD');
    assert.equal(viewModels.pdf.id, 101);
    assert.equal(viewModels.pdf.mhDisponible, true);
    assert.equal(
      viewModels.pdf.pdfUrl,
      '/api/files/pdf?path=docs%2Ffactura.pdf&token=token-xyz'
    );
    assert.equal(viewModels.contabilizacion.totals.totalFactura, 1000);
    assert.equal(viewModels.contabilizacion.totals.rebajosAplicados, 175);
    assert.equal(viewModels.estado.estadoUser, 'admin');
    assert.equal(viewModels.historial.estados.length, 1);
    assert.equal(viewModels.comentarios.comentarios.length, 1);
  } finally {
    restore();
  }
});

test('sub-builders de buildFacturaDetalleViewModels conservan contratos por seccion', () => {
  const restore = setLocalStorageMock({ token: 'token-abc' });
  try {
    const factura = {
      id: 202,
      ruta_pdf: 'docs/factura-202.pdf',
      ruta_xml: 'docs/factura-202.xml',
      has_mensaje_hacienda: true,
      resumen: { CodigoTipoMoneda: { CodigoMoneda: 'CRC' }, TotalComprobante: 500 }
    };
    const detalle = createDetalleFixture();

    const summary = buildSummarySectionViewModel({ factura });
    const pdf = buildPdfSectionViewModel({ id: 202, factura, detalle });
    const contabilizacion = buildContabilizacionSectionViewModel({ factura, detalle });
    const estadoComentarios = buildEstadoComentariosSectionViewModels({ detalle });

    assert.equal(summary.factura.id, 202);
    assert.equal(summary.monedaFactura, 'CRC');
    assert.equal(pdf.id, 202);
    assert.equal(pdf.pdfUrl, '/api/files/pdf?path=docs%2Ffactura-202.pdf&token=token-abc');
    assert.equal(contabilizacion.totals.totalFactura, 500);
    assert.equal(estadoComentarios.estado.estadoUser, 'admin');
    assert.equal(estadoComentarios.historial.estados.length, 1);
    assert.equal(estadoComentarios.comentarios.comentarios.length, 1);
  } finally {
    restore();
  }
});
