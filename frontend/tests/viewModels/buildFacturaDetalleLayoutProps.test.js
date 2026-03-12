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
    title: 'Documento #101',
    subtitle: 'Detalle del documento',
    backTo: '/facturas',
    backLabel: 'Volver a documentos'
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

  assert.equal(layoutProps.header.title, 'Documento #101');
  assert.equal(layoutProps.leftColumn.summary.factura.id, 101);
  assert.equal(layoutProps.leftColumn.pdf.id, 101);
  assert.equal(layoutProps.rightColumn.contabilizacion.totals.totalFactura, 1000);
  assert.equal(layoutProps.rightColumn.estado.estadoUser, 'admin');
  assert.equal(layoutProps.rightColumn.historial.estados.length, 1);
  assert.equal(layoutProps.rightColumn.comentarios.comentarios.length, 1);
});

test('sub-builders de FacturaDetalleLayoutProps conservan contratos por seccion', () => {
  const input = createInput();
  const header = buildFacturaDetalleHeaderLayoutProps(input);
  const leftColumn = buildFacturaDetalleLeftColumnLayoutProps(input);
  const rightColumn = buildFacturaDetalleRightColumnLayoutProps(input);

  assert.equal(header.backTo, '/facturas');
  assert.equal(leftColumn.summary.factura.id, 101);
  assert.equal(leftColumn.pdf.id, 101);
  assert.equal(rightColumn.contabilizacion.totals.totalFactura, 1000);
  assert.equal(rightColumn.comentarios.comentarios.length, 1);
});
