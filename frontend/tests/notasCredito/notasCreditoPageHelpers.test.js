import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFilterChips,
  buildVisiblePages,
  getSummaryByMoneda,
} from '../../src/components/notasCredito/notasCreditoPageHelpers.js';

test('notasCreditoPageHelpers construye chips activos y paginacion visible', () => {
  assert.deepEqual(
    buildFilterChips({
      search: 'Proveedor QA',
      estado: 'disponible',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      emisorNombre: 'Acme',
      moneda: 'USD',
      montoMin: '10',
      montoMax: '',
    }).map((chip) => chip.key),
    ['search', 'estado', 'emisor', 'moneda', 'fechaDesde', 'fechaHasta', 'montoMin'],
  );

  assert.deepEqual(
    buildVisiblePages(4, 9),
    [1, 2, 3, 4, 5, 6, 'ellipsis-6-9', 9],
  );
});

test('notasCreditoPageHelpers resume totales y saldos por moneda', () => {
  assert.equal(getSummaryByMoneda({ byMoneda: [] }, 'totalAmount'), '-');
  assert.equal(
    getSummaryByMoneda({
      byMoneda: [
        { moneda: 'CRC', totalAmount: 1000, totalSaldoDisponible: 900 },
        { moneda: 'USD', totalAmount: 20, totalSaldoDisponible: 10 },
      ],
    }, 'totalSaldoDisponible'),
    'CRC 900.00  |  USD 10.00',
  );
});
