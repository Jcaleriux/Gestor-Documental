import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardFacturasLink,
  buildDashboardViewModel,
} from '../../src/components/dashboard/dashboardViewModel.js';

test('buildDashboardFacturasLink conserva el contexto de retorno al dashboard', () => {
  assert.equal(
    buildDashboardFacturasLink('vencidas'),
    '/facturas?dashboardPreset=vencidas&returnTo=%2F&returnLabel=Dashboard',
  );
});

test('buildDashboardViewModel arma una vista de tesoreria con banner multicurrency y accesos rapidos', () => {
  const viewModel = buildDashboardViewModel({
    stats: {
      cuentasPorPagar: {
        documentos: 5,
        montosPorMoneda: [
          { moneda: 'CRC', monto: 1200 },
          { moneda: 'USD', monto: 300 },
        ],
      },
      vencidas: {
        documentos: 2,
        montosPorMoneda: [{ moneda: 'CRC', monto: 800 }],
      },
      porVencer7Dias: {
        documentos: 3,
        montosPorMoneda: [{ moneda: 'USD', monto: 150 }],
      },
      retencionesPendientes: {
        documentos: 1,
        montosPorMoneda: [{ moneda: 'CRC', monto: 50 }],
      },
      pagadas: {
        documentos: 7,
        montosPorMoneda: [{ moneda: 'CRC', monto: 2000 }],
      },
      topProveedoresPorPagar: {
        CRC: [{ proveedorId: 1 }, { proveedorId: 2 }],
        USD: [{ proveedorId: 3 }],
      },
      totalesPorMoneda: {
        CRC: {
          no_contabilizadas: { count: 1, total: 100 },
          contabilizadas: { count: 2, total: 300 },
          en_tramite: { count: 1, total: 75 },
          pagadas: { count: 4, total: 1200 },
        },
        USD: {
          no_contabilizadas: { count: 0, total: 0 },
          contabilizadas: { count: 1, total: 50 },
          en_tramite: { count: 2, total: 100 },
          pagadas: { count: 1, total: 25 },
        },
      },
      resumenEstados: {
        no_contabilizadas: 1,
        en_tramite: 3,
      },
      totalFacturas: 12,
      totalMes: 4,
      noContabilizado: 1,
      enRevision: 2,
    },
    recentDocs: [{ id: 10 }, { id: 11 }],
    authUser: {
      nombre: 'Ana Maria',
      rol_codigo: 'tesoreria_analista',
      rol_nombre: 'Tesoreria',
    },
    userPermissions: ['documentos_ver', 'documentos_tramitar_pago'],
    selectedSociedadName: 'Novogar CR',
  });

  assert.equal(viewModel.dashboardProfile, 'tesoreria');
  assert.equal(viewModel.banner.title, 'Modo multicurrency activo');
  assert.equal(viewModel.greetingName, 'Ana');
  assert.equal(viewModel.roleLabel, 'Tesoreria');
  assert.equal(viewModel.cards[0].linkTo, '/facturas?dashboardPreset=por_pagar&returnTo=%2F&returnLabel=Dashboard');
  assert.equal(viewModel.focusItems[3].label, 'Proveedores criticos');
  assert.equal(viewModel.focusItems[3].value, 3);
  assert.deepEqual(
    viewModel.quickActions.map((item) => item.label),
    ['Facturas', 'Notas de credito', 'Tiquetes', 'Tramites'],
  );
  assert.ok(
    viewModel.profileNotes.some((note) => note.includes('nunca como un total consolidado entre divisas')),
  );
});

test('buildDashboardViewModel usa el modo consulta cuando no hay permisos de workflow', () => {
  const viewModel = buildDashboardViewModel({
    stats: {
      totalFacturas: 8,
      totalMes: 2,
      noContabilizado: 0,
      enRevision: 1,
      resumenEstados: {
        no_contabilizadas: 0,
        en_tramite: 2,
      },
      pagadas: {
        documentos: 4,
        montosPorMoneda: [{ moneda: 'CRC', monto: 1000 }],
      },
      totalesPorMoneda: {
        CRC: {
          no_contabilizadas: { count: 0, total: 0 },
          contabilizadas: { count: 2, total: 300 },
          en_tramite: { count: 2, total: 500 },
          pagadas: { count: 4, total: 1000 },
        },
      },
    },
    recentDocs: [],
    authUser: {
      nombre: 'Carlos',
      rol_codigo: 'consulta',
    },
    userPermissions: [],
    selectedSociedadName: 'Sociedad Norte',
  });

  assert.equal(viewModel.dashboardProfile, 'consulta');
  assert.equal(viewModel.banner.title, 'Modo consulta activo');
  assert.equal(viewModel.cards[0].title, 'Total documentos');
  assert.equal(viewModel.quickActions.length, 0);
  assert.ok(viewModel.profileNotes[0].includes('Sociedad Norte'));
});
