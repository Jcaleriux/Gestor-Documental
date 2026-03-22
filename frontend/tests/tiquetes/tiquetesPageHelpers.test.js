import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFilterChips,
  buildVisiblePages,
  getSummaryByMoneda,
} from '../../src/components/tiquetes/tiquetesPageHelpers.js';

test('tiquetesPageHelpers construye chips activos y paginacion visible', () => {
  assert.deepEqual(
    buildFilterChips({
      search: 'Proveedor QA',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      emisorNombre: 'Acme',
      moneda: 'CRC',
      montoMin: '100',
      montoMax: '',
    }).map((chip) => chip.key),
    ['search', 'emisor', 'moneda', 'fechaDesde', 'fechaHasta', 'montoMin'],
  );

  assert.deepEqual(
    buildVisiblePages(5, 10),
    [1, 'ellipsis-1-3', 3, 4, 5, 6, 7, 'ellipsis-7-10', 10],
  );
});

test('tiquetesPageHelpers resume totales por moneda', () => {
  assert.equal(getSummaryByMoneda({ byMoneda: [] }), '-');
  assert.equal(
    getSummaryByMoneda({
      byMoneda: [
        { moneda: 'CRC', totalAmount: 1500 },
        { moneda: 'USD', totalAmount: 20 },
      ],
    }),
    'CRC 1,500.00  |  USD 20.00',
  );
});
