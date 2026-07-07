import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationCenterViewModel } from '../../src/components/notifications/notificationCenterViewModel.js';

test('buildNotificationCenterViewModel prioriza rechazos, aprobaciones y documentos accionables', () => {
  const viewModel = buildNotificationCenterViewModel({
    updatedAt: '2026-03-22T10:00:00.000Z',
    facturas: {
      enRevision: 2,
      noContabilizadas: 0,
      porPagar: 5,
      vencidas: 1,
      porVencer7Dias: 0,
      retencionesPendientes: 1,
    },
    tramites: {
      rechazadosActivos: 3,
      porEstado: {
        en_revision_tesoreria_1: 2,
        en_revision_tesoreria_2: 0,
      },
      aprobacionesPendientes: {
        gerencia: 4,
        gerencia_contable: 0,
        financiera: 1,
      },
    },
    documentosRecientes: {
      conMotivo: 1,
    },
  });

  assert.equal(viewModel.updatedAt, '2026-03-22T10:00:00.000Z');
  assert.equal(viewModel.totalActionCount, 20);
  assert.equal(viewModel.badgeCount, 9);
  assert.equal(viewModel.badgeLabel, '9');
  assert.equal(viewModel.actionSummary, '20 acciones pendientes');
  assert.deepEqual(
    viewModel.items.map((item) => item.id),
    [
      'rechazos-activos',
      'facturas-vencidas',
      'aprobacion-gerencia',
      'aprobacion-financiera',
      'facturas-en-revision',
      'retenciones-pendientes',
      'facturas-listas-tramite',
      'tramites-caratulas',
      'documentos-con-motivo',
    ],
  );
  assert.equal(
    viewModel.items.find((item) => item.id === 'facturas-en-revision').to,
    '/facturas?dashboardPreset=en_revision&returnTo=%2F&returnLabel=Dashboard',
  );
  assert.equal(
    viewModel.items.find((item) => item.id === 'aprobacion-gerencia').to,
    '/tramites?returnTo=%2F&returnLabel=Dashboard&estado=en_aprobacion_gerencia',
  );
  assert.deepEqual(
    viewModel.categorySummary.map((entry) => `${entry.category}:${entry.count}`),
    [
      'Rechazos:3',
      'Facturas:9',
      'Aprobaciones:5',
      'Tramites:2',
      'Documentos:1',
    ],
  );
});

test('buildNotificationCenterViewModel retorna estado vacio sin acciones', () => {
  const viewModel = buildNotificationCenterViewModel({
    facturas: {},
    tramites: {
      porEstado: {},
      aprobacionesPendientes: {},
    },
    documentosRecientes: {},
  });

  assert.deepEqual(viewModel.items, []);
  assert.deepEqual(viewModel.categorySummary, []);
  assert.equal(viewModel.totalActionCount, 0);
  assert.equal(viewModel.badgeCount, 0);
  assert.equal(viewModel.badgeLabel, '');
  assert.equal(viewModel.actionSummary, 'Sin acciones pendientes');
});

test('buildNotificationCenterViewModel normaliza conteos invalidos', () => {
  const viewModel = buildNotificationCenterViewModel({
    facturas: {
      enRevision: '3.8',
      vencidas: -4,
    },
    tramites: {
      rechazadosActivos: 'abc',
      porEstado: {
        en_revision_tesoreria_2: '2',
      },
      aprobacionesPendientes: {
        gerencia: 1.9,
      },
    },
    documentosRecientes: {
      conMotivo: null,
    },
  });

  assert.deepEqual(
    viewModel.items.map((item) => `${item.id}:${item.count}`),
    [
      'aprobacion-gerencia:1',
      'facturas-en-revision:3',
      'tramites-pago:2',
    ],
  );
  assert.equal(viewModel.totalActionCount, 6);
});
