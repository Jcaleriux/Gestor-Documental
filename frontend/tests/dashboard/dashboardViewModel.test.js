import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardFacturasLink,
  buildDashboardTramitesLink,
  buildDashboardViewModel,
} from '../../src/components/dashboard/dashboardViewModel.js';

const baseStats = {
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
  totalSociedades: 2,
};

const baseWorkQueue = {
  updatedAt: '2026-03-22T09:00:00.000Z',
  facturas: {
    noContabilizadas: 4,
    enRevision: 2,
    porPagar: 5,
    vencidas: 2,
    porVencer7Dias: 3,
    retencionesPendientes: 1,
    enTramite: 6,
    pagadas: 7,
  },
  tramites: {
    activos: 4,
    porEstado: {
      en_aprobacion_gerencia: 1,
      en_aprobacion_gerencia_contable: 2,
      en_aprobacion_gerencia_financiera: 3,
      en_revision_tesoreria: 1,
      en_revision_tesoreria_1: 2,
      en_revision_tesoreria_2: 1,
      pagado: 7,
      cancelado: 0,
    },
    aprobacionesPendientes: {
      gerencia: 2,
      gerencia_contable: 3,
      financiera: 4,
    },
    rechazadosActivos: 1,
  },
  documentosRecientes: {
    total: 2,
    conMotivo: 1,
  },
  sociedades: {
    visibles: 2,
  },
};

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

test('buildDashboardViewModel arma una vista de tesoreria con cola primaria y alertas operativas', () => {
  const viewModel = buildDashboardViewModel({
    stats: baseStats,
    workQueue: baseWorkQueue,
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
  assert.equal(viewModel.primaryQueueItems[0].label, 'Cola por pagar');
  assert.equal(viewModel.primaryQueueItems[3].to, '/tramites?returnTo=%2F&returnLabel=Dashboard&estado=en_revision_tesoreria_2');
  assert.equal(viewModel.secondaryAlerts[0].value, 3);
  assert.deepEqual(
    viewModel.quickActions.map((item) => item.label),
    ['Facturas', 'Notas de credito', 'Tiquetes', 'Tramites'],
  );
  assert.ok(
    viewModel.profileNotes.some((note) => note.includes('nunca como un total consolidado entre divisas')),
  );
});

test('buildDashboardViewModel prioriza aprobaciones para gerencia', () => {
  const viewModel = buildDashboardViewModel({
    stats: baseStats,
    workQueue: baseWorkQueue,
    recentDocs: [{ id: 21, motivo: 'Escalar' }],
    authUser: {
      nombre: 'Laura',
      rol_codigo: 'gerencia_finanzas',
      rol_nombre: 'Gerencia',
    },
    userPermissions: ['documentos_ver', 'documentos_aprobar_gerencia', 'documentos_aprobar_gerencia_contable'],
    selectedSociedadName: 'Sociedad Norte',
  });

  assert.equal(viewModel.dashboardProfile, 'gerencia');
  assert.deepEqual(
    viewModel.primaryQueueItems.map((item) => item.label),
    ['Pendientes gerencia', 'Gerencia contable', 'Gerencia financiera', 'Rechazados activos'],
  );
  assert.equal(viewModel.primaryQueueItems[0].value, 2);
  assert.equal(
    viewModel.primaryQueueItems[1].to,
    '/tramites?returnTo=%2F&returnLabel=Dashboard&estado=en_aprobacion_gerencia_contable',
  );
  assert.equal(viewModel.secondaryAlerts[1].to, '/facturas?dashboardPreset=en_tramite&returnTo=%2F&returnLabel=Dashboard');
});

test('buildDashboardViewModel usa cola documental para contabilidad', () => {
  const viewModel = buildDashboardViewModel({
    stats: baseStats,
    workQueue: baseWorkQueue,
    recentDocs: [],
    authUser: {
      nombre: 'Marta',
      rol_codigo: 'contabilidad',
      rol_nombre: 'Contabilidad',
    },
    userPermissions: ['documentos_ver', 'documentos_contabilizar'],
    selectedSociedadName: 'Sociedad Centro',
  });

  assert.equal(viewModel.dashboardProfile, 'contabilidad');
  assert.equal(viewModel.primaryQueueItems[1].to, '/facturas?dashboardPreset=en_revision&returnTo=%2F&returnLabel=Dashboard');
  assert.equal(viewModel.primaryQueueItems[2].to, '/facturas?dashboardPreset=en_tramite&returnTo=%2F&returnLabel=Dashboard');
  assert.equal(viewModel.primaryQueueItems[3].to, '/retenciones-pendientes');
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
    workQueue: {
      facturas: {
        enTramite: 2,
        pagadas: 4,
      },
      documentosRecientes: {
        total: 1,
        conMotivo: 1,
      },
      sociedades: {
        visibles: 1,
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
  assert.deepEqual(
    viewModel.primaryQueueItems.map((item) => item.label),
    ['Pendientes observables', 'En tramite', 'Pagadas', 'Cambios recientes'],
  );
  assert.ok(viewModel.profileNotes[0].includes('Sociedad Norte'));
});
