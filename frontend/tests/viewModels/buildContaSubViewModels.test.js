import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  buildContaAssociationsViewModel,
  buildContaFormViewModel,
  buildContaModalsViewModel,
  buildContaRetencionViewModel,
  buildTablasModalViewModel,
  buildNotasModalViewModel,
  buildOrdenesModalViewModel
} from '../../src/components/facturaDetalle/viewModels/buildContaSubViewModels.js';

const createDetalleFixture = () => ({
  conta: { proveedor_id: '5', notas: 'ok' },
  proveedoresSociedad: [{ id: 5, nombre: 'Proveedor X' }],
  contaSaving: false,
  contaMessage: 'guardado',
  contaError: '',
  handleContaChange: createMockFn(),
  guardarContabilizacion: createMockFn(),
  tablasLoading: false,
  ordenesLoading: true,
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
  tablasModalOpen: true,
  tablasError: 'sin tablas',
  tablasPagoProveedor: [{ id: 11, nombre: 'Tabla 11' }],
  setTablasModalOpen: createMockFn(),
  asociarTablaPago: createMockFn(),
  notasModalOpen: false,
  notasError: '',
  notasCreditoProveedor: [{ id: 31, clave: 'NC-31' }],
  setNotasModalOpen: createMockFn(),
  asociarNotaCredito: createMockFn(),
  ordenesModalOpen: true,
  ordenesError: '',
  ordenesCompraProveedor: [{ id: 21, nombre: 'OC 21', moneda: 'CRC', monto_disponible: 100 }],
  setOrdenesModalOpen: createMockFn(),
  asociarOrdenCompra: createMockFn(),
  retencionPagoMonto: '10.00',
  setRetencionPagoMonto: createMockFn(),
  retencionPagoFecha: '2026-02-27',
  setRetencionPagoFecha: createMockFn(),
  retencionPagoNotas: 'nota',
  setRetencionPagoNotas: createMockFn(),
  retencionPagoSaving: false,
  retencionPagoError: '',
  retencionPagoMessage: 'ok',
  registrarPagoRetencion: createMockFn(),
  retencionPagos: [{ id: 1, monto: 10 }]
});

test('buildContaFormViewModel conserva estado y handlers del formulario', () => {
  const detalle = createDetalleFixture();
  const form = buildContaFormViewModel({ detalle });

  assert.equal(form.conta, detalle.conta);
  assert.equal(form.proveedoresSociedad, detalle.proveedoresSociedad);
  assert.equal(form.guardarContabilizacion, detalle.guardarContabilizacion);
});

test('buildContaAssociationsViewModel conserva asociaciones y acciones', () => {
  const detalle = createDetalleFixture();
  const associations = buildContaAssociationsViewModel({ detalle });

  assert.equal(associations.tablaPagoActual.id, 11);
  assert.equal(associations.ordenCompraActual.id, 21);
  assert.equal(associations.abrirAsociarNotaCredito, detalle.abrirAsociarNotaCredito);
});

test('buildContaModalsViewModel arma modales y ejecuta onClose por tipo', () => {
  const detalle = createDetalleFixture();
  const modals = buildContaModalsViewModel({ detalle });

  assert.equal(modals.tablas.isOpen, true);
  assert.equal(modals.notas.isOpen, false);
  assert.equal(modals.ordenes.isOpen, true);

  modals.tablas.onClose();
  modals.notas.onClose();
  modals.ordenes.onClose();

  assert.deepEqual(detalle.setTablasModalOpen.calls[0], [false]);
  assert.deepEqual(detalle.setNotasModalOpen.calls[0], [false]);
  assert.deepEqual(detalle.setOrdenesModalOpen.calls[0], [false]);
  assert.equal(modals.ordenes.renderLabel(detalle.ordenesCompraProveedor[0]).includes('OC 21'), true);
});

test('buildContaRetencionViewModel combina totales con estado de retencion', () => {
  const detalle = createDetalleFixture();
  const totals = { retencionTotal: 100, retencionPendiente: 40 };
  const retencion = buildContaRetencionViewModel({ detalle, totals });

  assert.equal(retencion.retencionTotal, 100);
  assert.equal(retencion.retencionPendiente, 40);
  assert.equal(retencion.registrarPagoRetencion, detalle.registrarPagoRetencion);
  assert.equal(retencion.retencionPagos.length, 1);
});

test('sub-builders de modales conservan contratos por tipo', () => {
  const detalle = createDetalleFixture();
  const tablas = buildTablasModalViewModel({ detalle });
  const notas = buildNotasModalViewModel({ detalle });
  const ordenes = buildOrdenesModalViewModel({ detalle });

  assert.equal(tablas.isOpen, true);
  assert.equal(notas.isOpen, false);
  assert.equal(ordenes.isOpen, true);
  assert.equal(tablas.renderLabel(detalle.tablasPagoProveedor[0]), 'Tabla 11');
  assert.equal(notas.renderLabel(detalle.notasCreditoProveedor[0]), 'NC-31');
  assert.equal(ordenes.renderLabel(detalle.ordenesCompraProveedor[0]).includes('OC 21'), true);
});
