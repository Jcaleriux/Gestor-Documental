import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCentrosCostoTemplateCsv,
  buildCentroCostoResumen,
  createCentroCostoLinea,
  ensureCentrosCostoMetadata,
  getCentroCostoAprobadorNombre,
  calculateCentrosCostoDistribution,
  parseCentrosCostoCsv,
} from '../../src/utils/centrosCosto.js';

test('parseCentrosCostoCsv soporta plantilla normalizada', () => {
  const rows = parseCentrosCostoCsv([
    'codigo;nombre;codigo_padre;email_aprobador;rol_aprobador;seleccionable_en_contabilizacion;activo;orden',
    '11ROOT;11 - PROYECTO DEMO;ROOT;demo@novogar.local;;false;true;1',
    '1100000;COSTOS DIRECTOS;11ROOT;demo@novogar.local;;true;true;2',
  ].join('\n'));

  assert.equal(rows.length, 2);
  assert.equal(rows[0].codigo, '11ROOT');
  assert.equal(rows[0].codigo_padre, 'ROOT');
  assert.equal(rows[1].seleccionable_en_contabilizacion, true);
});

test('parseCentrosCostoCsv soporta comillas y delimitadores dentro de celdas', () => {
  const rows = parseCentrosCostoCsv([
    'codigo;nombre;codigo_padre;email_aprobador;rol_aprobador;seleccionable_en_contabilizacion;activo;orden',
    '11ROOT;"11 - PROYECTO; ""DEMO""";ROOT;demo@novogar.local;;false;true;1',
    '1100000;"COSTOS DIRECTOS, ETAPA 1";11ROOT;demo@novogar.local;;true;true;2',
  ].join('\n'));

  assert.equal(rows.length, 2);
  assert.equal(rows[0].nombre, '11 - PROYECTO; "DEMO"');
  assert.equal(rows[1].nombre, 'COSTOS DIRECTOS, ETAPA 1');
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

test('buildCentrosCostoTemplateCsv exporta el catalogo actual y se puede reimportar', () => {
  const csv = buildCentrosCostoTemplateCsv([
    {
      codigo: '1100000',
      nombre: 'COSTOS DIRECTOS; ETAPA 1',
      centro_padre_codigo: '11ROOT',
      usuario_aprobador_email: 'obra@novogar.local',
      rol_aprobador_codigo: '',
      seleccionable_en_contabilizacion: true,
      activo: true,
      orden: 2,
    },
    {
      codigo: '11ROOT',
      nombre: '11 - PROYECTO "DEMO"',
      centro_padre_codigo: '',
      usuario_aprobador_email: '',
      rol_aprobador_codigo: 'GERENCIA_OBRA',
      seleccionable_en_contabilizacion: false,
      activo: true,
      orden: 1,
    },
  ]);

  const rows = parseCentrosCostoCsv(csv);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].codigo, '11ROOT');
  assert.equal(rows[0].codigo_padre, 'ROOT');
  assert.equal(rows[0].nombre, '11 - PROYECTO "DEMO"');
  assert.equal(rows[0].rol_aprobador, 'GERENCIA_OBRA');
  assert.equal(rows[1].codigo, '1100000');
  assert.equal(rows[1].codigo_padre, '11ROOT');
  assert.equal(rows[1].nombre, 'COSTOS DIRECTOS; ETAPA 1');
  assert.match(csv, /"11 - PROYECTO ""DEMO"""/);
  assert.match(csv, /"COSTOS DIRECTOS; ETAPA 1"/);
});

test('getCentroCostoAprobadorNombre prioriza el rol cuando existe', () => {
  assert.equal(getCentroCostoAprobadorNombre({
    rol_aprobador_id: 4,
    rol_aprobador_nombre: 'Gerencia de proyecto',
    usuario_aprobador_nombre: 'Usuario puntual'
  }), 'Gerencia de proyecto');
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
