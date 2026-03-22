import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCentroCostoLineScope } from '../../src/components/facturaDetalle/contabilizacion/centroCostoLineScope.js';

test('buildCentroCostoLineScope usa la seleccion actual como scope de la linea', () => {
  assert.equal(
    buildCentroCostoLineScope({
      centro_costo_id: 15,
      codigo: 'CC-10',
      nombre: 'Marketing',
    }),
    '15::CC-10::Marketing',
  );
});

test('buildCentroCostoLineScope cambia cuando cambia el centro seleccionado', () => {
  const initialScope = buildCentroCostoLineScope({
    centro_costo_id: 15,
    codigo: 'CC-10',
    nombre: 'Marketing',
  });
  const nextScope = buildCentroCostoLineScope({
    centro_costo_id: 18,
    codigo: 'CC-11',
    nombre: 'Operaciones',
  });

  assert.notEqual(initialScope, nextScope);
});
