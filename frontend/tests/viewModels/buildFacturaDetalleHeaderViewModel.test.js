import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacturaDetalleHeaderViewModel } from '../../src/components/facturaDetalle/viewModels/buildFacturaDetalleHeaderViewModel.js';

test('buildFacturaDetalleHeaderViewModel arma title/subtitle/back con consecutivo de factura', () => {
  const header = buildFacturaDetalleHeaderViewModel({
    factura: { id: 101, consecutivo: '00100001010000001606' }
  });

  assert.equal(header.title, 'Contabilizacion de factura');
  assert.equal(header.subtitle, 'Factura #00100001010000001606');
  assert.equal(header.backTo, '/facturas');
  assert.equal(header.backLabel, 'Volver a facturas');
});

test('buildFacturaDetalleHeaderViewModel soporta factura sin id', () => {
  const header = buildFacturaDetalleHeaderViewModel({
    factura: {}
  });

  assert.equal(header.title, 'Contabilizacion de factura');
  assert.equal(header.backTo, '/facturas');
});
