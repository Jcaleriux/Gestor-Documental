import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAvailableCurrencies,
  getCostCenterLabels,
  getMonthlySeries,
} from '../../src/components/explorador/exploradorDocumentosView.js';

test('separa monedas y limita la serie a los meses recientes', () => {
  const resumen = {
    totalesPorMoneda: [{ moneda: 'CRC' }, { moneda: 'USD' }],
    serieMensual: [
      { mes: '2026-01', moneda: 'CRC', total: 100 },
      { mes: '2026-01', moneda: 'USD', total: 10 },
      { mes: '2026-02', moneda: 'CRC', total: 200 },
    ],
  };

  assert.deepEqual(getAvailableCurrencies(resumen), ['CRC', 'USD']);
  assert.deepEqual(getMonthlySeries(resumen, 'CRC', 1), [
    { mes: '2026-02', moneda: 'CRC', total: 200 },
  ]);
});

test('combina centros de costo sin duplicados', () => {
  const documento = {
    contabilizacion: {
      centroCosto: 'CC-01',
      centrosCostoLineas: [{ codigo: 'CC-01' }, { nombre: 'Operaciones' }],
    },
  };

  assert.deepEqual(getCostCenterLabels(documento), ['CC-01', 'Operaciones']);
});
