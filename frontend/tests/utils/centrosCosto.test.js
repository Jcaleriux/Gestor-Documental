import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCentroCostoResumen,
  createCentroCostoLinea,
  ensureCentrosCostoMetadata,
  calculateCentrosCostoDistribution,
  parseCentrosCostoCsv,
} from '../../src/utils/centrosCosto.js';

test('parseCentrosCostoCsv soporta plantilla normalizada', () => {
  const rows = parseCentrosCostoCsv([
    'codigo;nombre;codigo_padre;email_aprobador;seleccionable_en_contabilizacion;activo;orden',
    '11ROOT;11 - PROYECTO DEMO;ROOT;demo@novogar.local;false;true;1',
    '1100000;COSTOS DIRECTOS;11ROOT;demo@novogar.local;true;true;2',
  ].join('\n'));

  assert.equal(rows.length, 2);
  assert.equal(rows[0].codigo, '11ROOT');
  assert.equal(rows[0].codigo_padre, 'ROOT');
  assert.equal(rows[1].seleccionable_en_contabilizacion, true);
});

test('parseCentrosCostoCsv soporta formato legacy por columnas', () => {
  const rows = parseCentrosCostoCsv([
    'Descripcion;Descripcion',
    '11 - ECO MORAVIA;11 - ECO MORAVIA',
    '1100000 - COSTOS DIRECTOS E INDIRECTOS DE OBRA;1100000 - COSTOS DIRECTOS E INDIRECTOS DE OBRA',
    '11Z0000 - COSTOS DIRECTOS COMUNES DE OBRA;11Y0000 - GASTOS DE OPERACION PROYECTO',
    '11Z0100 - DIRECTOS COMUNES - TERRENOS;',
  ].join('\n'));

  const node1100000 = rows.find((item) => item.codigo === '1100000');
  const node11Z0100 = rows.find((item) => item.codigo === '11Z0100');

  assert.equal(node1100000?.codigo_padre, '11');
  assert.equal(node11Z0100?.codigo_padre, '11Z0000');
  assert.equal(node11Z0100?.seleccionable_en_contabilizacion, true);
});

test('buildCentroCostoResumen resume multiples lineas sin perder el primero', () => {
  const resumen = buildCentroCostoResumen([
    createCentroCostoLinea({ codigo: '11Z0100', nombre: 'TERRENOS', monto: '100' }),
    createCentroCostoLinea({ codigo: '11Z0200', nombre: 'INFRAESTRUCTURA', monto: '50' }),
    createCentroCostoLinea({ codigo: '11Z0300', nombre: 'SERVICIOS', monto: '20' }),
  ]);

  assert.match(resumen, /^11Z0100 - TERRENOS \+ 2 mas$/);
});

test('ensureCentrosCostoMetadata preserva lineas vacias durante la edicion cuando se solicita', () => {
  const metadata = ensureCentrosCostoMetadata({
    centros_costo_lineas: [createCentroCostoLinea()]
  }, { preserveEmpty: true });

  assert.equal(metadata.centros_costo_lineas.length, 1);
  assert.equal(metadata.centros_costo_lineas[0].codigo, '');
});

test('calculateCentrosCostoDistribution marca lineas vacias como incompletas', () => {
  const distribution = calculateCentrosCostoDistribution([
    createCentroCostoLinea(),
  ]);

  assert.equal(distribution.lineCount, 1);
  assert.equal(distribution.hasIncompleteLines, true);
  assert.equal(distribution.totalAsignado, 0);
});
