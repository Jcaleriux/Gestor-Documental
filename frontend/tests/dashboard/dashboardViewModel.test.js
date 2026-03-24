import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardFacturasLink,
  buildDashboardTramitesLink,
  buildDashboardViewModel,
} from '../../src/components/dashboard/dashboardViewModel.js';

const baseStats = {
  enRevision: 2,
  totalMes: 4,
  resumenEstados: {
    no_contabilizadas: 5,
    contabilizadas: 6,
    en_tramite: 3,
    pagadas: 7,
  },
  pagadas: {
    documentos: 7,
    montosPorMoneda: [{ moneda: 'CRC', monto: 2000 }],
  },
  porVencer7Dias: {
    documentos: 3,
    montosPorMoneda: [{ moneda: 'USD', monto: 150 }],
  },
  vencidas: {
    documentos: 2,
    montosPorMoneda: [{ moneda: 'CRC', monto: 800 }],
  },
  totalesPorMoneda: {
    USD: {
      no_contabilizadas: { count: 1, total: 50 },
      contabilizadas: { count: 2, total: 200 },
      en_tramite: { count: 1, total: 75 },
      pagadas: { count: 1, total: 120 },
    },
    CRC: {
      no_contabilizadas: { count: 4, total: 1000 },
      contabilizadas: { count: 4, total: 5000 },
      en_tramite: { count: 2, total: 900 },
      pagadas: { count: 6, total: 7000 },
    },
  },
  topProveedoresPorPagar: {
    CRC: [
      { proveedorId: 1, proveedorNombre: 'CRC 1' },
      { proveedorId: 2, proveedorNombre: 'CRC 2' },
      { proveedorId: 3, proveedorNombre: 'CRC 3' },
      { proveedorId: 4, proveedorNombre: 'CRC 4' },
    ],
    USD: [
      { proveedorId: 11, proveedorNombre: 'USD 1' },
      { proveedorId: 12, proveedorNombre: 'USD 2' },
      { proveedorId: 13, proveedorNombre: 'USD 3' },
      { proveedorId: 14, proveedorNombre: 'USD 4' },
    ],
    EUR: [
      { proveedorId: 21, proveedorNombre: 'EUR 1' },
    ],
  },
};

const baseRecentDocs = [
  { id: 1, factura_id: 10, consecutivo: '00100001010000000001' },
  { id: 2, factura_id: 11, consecutivo: '00100001010000000002' },
  { id: 3, factura_id: 12, consecutivo: '00100001010000000003' },
  { id: 4, factura_id: 13, consecutivo: '00100001010000000004' },
  { id: 5, factura_id: 14, consecutivo: '00100001010000000005' },
];

test('buildDashboardFacturasLink conserva el contexto de retorno al dashboard', () => {
  assert.equal(
    buildDashboardFacturasLink('vencidas'),
    '/facturas?dashboardPreset=vencidas&returnTo=%2F&returnLabel=Dashboard',
  );
});

test('buildDashboardTramitesLink conserva contexto y estado del workflow', () => {
  assert.equal(
    buildDashboardTramitesLink('en_revision_tesoreria_2'),
    '/tramites?returnTo=%2F&returnLabel=Dashboard&estado=en_revision_tesoreria_2',
  );
});

test('buildDashboardViewModel arma una vista general unica para todos los usuarios', () => {
  const viewModel = buildDashboardViewModel({
    stats: baseStats,
    recentDocs: baseRecentDocs,
    authUser: {
      nombre: 'Tesoreria Auxiliar',
      rol_codigo: 'tesoreria_auxiliar',
    },
    userPermissions: [],
    selectedSociedadName: 'BSP',
  });

  assert.equal(viewModel.dashboardProfile, 'general');
  assert.equal(viewModel.visibleSociedadName, 'BSP');
  assert.deepEqual(
    viewModel.cards.map((card) => card.title),
    [
      'Facturas no contabilizadas',
      'Facturas disponibles para tramitar',
      'En tramite de pagos',
      'Pagadas',
      'En revision contabilidad',
      'Por vencer 7 dias',
      'Vencidas',
      'Recibidas ultimo mes',
    ],
  );
  assert.equal(
    viewModel.cards[0].linkTo,
    '/facturas?dashboardPreset=no_contabilizadas&returnTo=%2F&returnLabel=Dashboard',
  );
  assert.equal(
    viewModel.cards[1].linkTo,
    '/facturas?dashboardPreset=contabilizadas&returnTo=%2F&returnLabel=Dashboard',
  );
  assert.equal(
    viewModel.cards[7].linkTo,
    '/facturas?dashboardPreset=recibidas_ultimo_mes&returnTo=%2F&returnLabel=Dashboard',
  );
  assert.deepEqual(viewModel.monedas, ['CRC', 'USD']);
  assert.equal(viewModel.visibleRecentDocs.length, 4);
  assert.deepEqual(
    viewModel.topProveedoresPorMoneda,
    [
      ['CRC', baseStats.topProveedoresPorPagar.CRC.slice(0, 3)],
      ['USD', baseStats.topProveedoresPorPagar.USD.slice(0, 3)],
    ],
  );
});

test('buildDashboardViewModel no depende del rol para definir las tarjetas', () => {
  const tesoreriaView = buildDashboardViewModel({
    stats: baseStats,
    recentDocs: baseRecentDocs,
    authUser: { rol_codigo: 'tesoreria_auxiliar' },
    userPermissions: ['documentos_tramitar_pago'],
  });
  const consultaView = buildDashboardViewModel({
    stats: baseStats,
    recentDocs: baseRecentDocs,
    authUser: { rol_codigo: 'consulta' },
    userPermissions: [],
  });

  assert.deepEqual(
    tesoreriaView.cards.map((card) => card.title),
    consultaView.cards.map((card) => card.title),
  );
  assert.deepEqual(tesoreriaView.topProveedoresPorMoneda, consultaView.topProveedoresPorMoneda);
});
