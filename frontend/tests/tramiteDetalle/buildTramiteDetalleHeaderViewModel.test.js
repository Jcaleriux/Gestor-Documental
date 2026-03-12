import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTramiteDetalleHeaderViewModel } from '../../src/components/tramiteDetalle/viewModels/buildTramiteDetalleHeaderViewModel.js';

test('buildTramiteDetalleHeaderViewModel arma title/subtitle/actionsClassName con id', () => {
  const header = buildTramiteDetalleHeaderViewModel({
    tramite: { id: 123 }
  });

  assert.equal(header.title, 'Tramite #123');
  assert.equal(header.subtitle, 'Detalle y decisiones del tramite de pago');
  assert.equal(header.actionsClassName, 'tramite-actions');
});

test('buildTramiteDetalleHeaderViewModel soporta tramite sin id', () => {
  const header = buildTramiteDetalleHeaderViewModel({
    tramite: {}
  });

  assert.equal(header.title, 'Tramite');
  assert.equal(header.actionsClassName, 'tramite-actions');
});
