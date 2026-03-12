import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacturaDetalleHeaderViewModel } from '../../src/components/facturaDetalle/viewModels/buildFacturaDetalleHeaderViewModel.js';

test('buildFacturaDetalleHeaderViewModel arma title/subtitle/back con id de factura', () => {
  const header = buildFacturaDetalleHeaderViewModel({
    factura: { id: 101 }
  });

  assert.equal(header.title, 'Documento #101');
  assert.equal(header.subtitle, 'Detalle del documento');
  assert.equal(header.backTo, '/facturas');
  assert.equal(header.backLabel, 'Volver a documentos');
});

test('buildFacturaDetalleHeaderViewModel soporta factura sin id', () => {
  const header = buildFacturaDetalleHeaderViewModel({
    factura: {}
  });

  assert.equal(header.title, 'Documento');
  assert.equal(header.backTo, '/facturas');
});
