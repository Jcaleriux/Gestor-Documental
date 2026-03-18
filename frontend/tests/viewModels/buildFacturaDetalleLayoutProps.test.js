import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacturaDetalleHeaderLayoutProps,
  buildFacturaDetalleLeftColumnLayoutProps,
  buildFacturaDetalleRightColumnLayoutProps,
  buildFacturaDetalleLayoutProps
} from '../../src/components/facturaDetalle/viewModels/buildFacturaDetalleLayoutProps.js';

const createInput = () => ({
  headerViewModel: {
    title: 'Contabilizacion de factura',
    subtitle: 'Factura #00100001010000001606',
    backTo: '/facturas',
    backLabel: 'Volver a facturas'
  },
  viewModels: {
    summary: { factura: { id: 101 } },
    pdf: { id: 101 },
    contabilizacion: { totals: { totalFactura: 1000 } },
    estado: { estadoUser: 'admin' },
    historial: { estados: [{ id: 1 }] },
    comentarios: { comentarios: [{ id: 1 }] }
  }
});

test('buildFacturaDetalleLayoutProps compone header y columnas', () => {
  const input = createInput();
  const layoutProps = buildFacturaDetalleLayoutProps(input);

  assert.equal(layoutProps.header.title, 'Contabilizacion de factura');
  assert.equal(layoutProps.summary.factura.id, 101);
  assert.equal(layoutProps.leftColumn.contabilizacion.totals.totalFactura, 1000);
  assert.equal(layoutProps.rightColumn.pdf.id, 101);
  assert.equal(layoutProps.rightColumn.historial.estados.length, 1);
  assert.equal(layoutProps.rightColumn.comentarios.comentarios.length, 1);
});

test('sub-builders de FacturaDetalleLayoutProps conservan contratos por seccion', () => {
  const input = createInput();
  const header = buildFacturaDetalleHeaderLayoutProps(input);
  const leftColumn = buildFacturaDetalleLeftColumnLayoutProps(input);
  const rightColumn = buildFacturaDetalleRightColumnLayoutProps(input);

  assert.equal(header.backTo, '/facturas');
  assert.equal(leftColumn.contabilizacion.totals.totalFactura, 1000);
  assert.equal(rightColumn.pdf.id, 101);
  assert.equal(rightColumn.comentarios.comentarios.length, 1);
});
