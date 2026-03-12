import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  buildContaTotalsViewModel,
  buildContaMainSectionsViewModel,
  buildContaRetencionSectionViewModel,
  buildContaViewModel
} from '../../src/components/facturaDetalle/viewModels/buildContaViewModel.js';

const createDetalleFixture = () => ({
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
  tablaPagoActual: { id: 11, nombre: 'Tabla 11' },
  ordenCompraActual: { id: 21, nombre: 'OC 21' },
  notaCreditoActual: { id: 31, clave: 'NC-31' },
  abrirAsociarTablaPago: createMockFn(),
  abrirAsociarOrdenCompra: createMockFn(),
  abrirAsociarNotaCredito: createMockFn(),
  verTablaPagoAsociada: createMockFn(),
  verOrdenCompraAsociada: createMockFn(),
  verNotaCreditoAsociada: createMockFn(),
  tablasModalOpen: false,
  tablasError: '',
  tablasPagoProveedor: [{ id: 11, nombre: 'Tabla 11' }],
  setTablasModalOpen: createMockFn(),
  asociarTablaPago: createMockFn(),
  notasModalOpen: false,
  notasError: '',
  notasCreditoProveedor: [{ id: 31, clave: 'NC-31' }],
  setNotasModalOpen: createMockFn(),
  asociarNotaCredito: createMockFn(),
  ordenesModalOpen: false,
  ordenesError: '',
  ordenesCompraProveedor: [{ id: 21, nombre: 'OC 21', moneda: 'CRC', monto_disponible: 100 }],
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
  retencionPagos: []
});

test('sub-builders de buildContaViewModel conservan contrato por seccion', () => {
  const factura = { resumen: { TotalComprobante: 1000 } };
  const detalle = createDetalleFixture();

  const totals = buildContaTotalsViewModel({ factura, detalle });
  const main = buildContaMainSectionsViewModel({ detalle });
  const retencion = buildContaRetencionSectionViewModel({ detalle, totals });

  assert.equal(totals.totalFactura, 1000);
  assert.equal(totals.rebajosAplicados, 175);
  assert.equal(main.form.conta, detalle.conta);
  assert.equal(main.associations.tablaPagoActual.id, 11);
  assert.equal(main.modals.tablas.items.length, 1);
  assert.equal(retencion.retencionTotal, 75);
  assert.equal(retencion.retencionPendiente, 50);
});

test('buildContaViewModel compone form/associations/modals/retencion/totals', () => {
  const factura = { resumen: { TotalComprobante: 1000 } };
  const detalle = createDetalleFixture();

  const viewModel = buildContaViewModel({ factura, detalle });

  assert.equal(viewModel.form.conta, detalle.conta);
  assert.equal(viewModel.associations.ordenCompraActual.id, 21);
  assert.equal(viewModel.modals.ordenes.items.length, 1);
  assert.equal(viewModel.retencion.retencionPendiente, 50);
  assert.equal(viewModel.totals.totalPagoPrincipal, 750);
});
