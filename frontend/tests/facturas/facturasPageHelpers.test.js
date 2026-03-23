import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacturasRoute,
  buildFilterChips,
  buildVisiblePages,
  getFacturasSummaryTotal,
  parseDashboardPresetFromSearch,
  parseReturnContextFromSearch,
} from '../../src/components/facturas/facturasPageHelpers.js';

test('facturasPageHelpers interpreta dashboard preset y contexto de retorno seguro desde search params', () => {
  assert.equal(
    parseDashboardPresetFromSearch('?dashboardPreset=vencidas'),
    'vencidas',
  );
  assert.equal(
    parseDashboardPresetFromSearch('?dashboardPreset=en_revision'),
    'en_revision',
  );
  assert.equal(
    parseDashboardPresetFromSearch('?dashboardPreset=en_tramite'),
    'en_tramite',
  );
  assert.equal(
    parseDashboardPresetFromSearch('?dashboardPreset=contabilizadas'),
    'contabilizadas',
  );
  assert.equal(
    parseDashboardPresetFromSearch('?dashboardPreset=recibidas_ultimo_mes'),
    'recibidas_ultimo_mes',
  );
  assert.equal(
    parseDashboardPresetFromSearch('?dashboardPreset=invalido'),
    '',
  );

  assert.deepEqual(
    parseReturnContextFromSearch('?returnTo=%2Fdashboard&returnLabel=Dashboard'),
    {
      returnTo: '/dashboard',
      returnLabel: 'Dashboard',
    },
  );

  assert.deepEqual(
    parseReturnContextFromSearch('?returnTo=%2F%2Fevil.com&returnLabel=hack'),
    {
      returnTo: '',
      returnLabel: '',
    },
  );

  assert.equal(
    buildFacturasRoute({
      dashboardPreset: 'vencidas',
      returnTo: '/dashboard',
      returnLabel: 'Dashboard',
    }),
    '/facturas?dashboardPreset=vencidas&returnTo=%2Fdashboard&returnLabel=Dashboard',
  );
});

test('facturasPageHelpers construye chips y paginacion visible para la vista', () => {
  assert.deepEqual(
    buildFilterChips({
      dashboardPreset: 'vencidas',
      search: 'Proveedor QA',
      estado: 'pagado',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      emisorNombre: 'Acme',
      moneda: 'CRC',
      montoMin: '100',
      montoMax: '',
    }).map((chip) => chip.key),
    ['dashboardPreset', 'search', 'estado', 'emisor', 'moneda', 'fechaDesde', 'fechaHasta', 'montoMin'],
  );

  assert.deepEqual(
    buildVisiblePages(5, 10),
    [1, 'ellipsis-1-3', 3, 4, 5, 6, 7, 'ellipsis-7-10', 10],
  );
});

test('facturasPageHelpers resume totales por moneda con formato legible', () => {
  assert.equal(getFacturasSummaryTotal({ byMoneda: [] }), '-');
  assert.equal(
    getFacturasSummaryTotal({
      byMoneda: [
        { moneda: 'CRC', totalAmount: 1500 },
        { moneda: 'USD', totalAmount: 20 },
      ],
    }),
    'CRC 1,500.00  |  USD 20.00',
  );
});
