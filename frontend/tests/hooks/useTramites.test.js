import test from 'node:test';
import assert from 'node:assert/strict';
import { useTramites } from '../../src/hooks/useTramites.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useTramitesHarness = (props) => useTramites(props);

const createDependencies = ({
  listTramites = createMockFn(async () => ({
    data: {
      success: true,
      data: [],
    },
  })),
  getRetencionesDisponibles = createMockFn(async () => ({
    data: {
      success: true,
      data: [],
    },
  })),
  crearTramite = createMockFn(async () => ({
    data: {
      success: true,
    },
  })),
  listAllFacturas = createMockFn(async () => []),
} = {}) => ({
  tramitesClient: {
    listTramites,
    getRetencionesDisponibles,
    crearTramite,
  },
  facturasClient: {
    listAllFacturas,
  },
});

test('useTramites no llama API ni expone datos cuando falta sociedadId', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTramitesHarness,
    initialProps: {
      sociedadId: '',
      estado: '',
      dependencies,
    },
  });

  await hook.flush({ cycles: 3 });

  assert.equal(dependencies.tramitesClient.listTramites.calls.length, 0);
  assert.deepEqual(hook.result.tramites, []);
  assert.deepEqual(hook.result.facturasDisponibles, []);
  assert.deepEqual(hook.result.retencionesDisponibles, []);
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.loadingDocs, false);
  assert.equal(hook.result.actionMessage, '');
  assert.equal(hook.result.actionError, '');
});

test('useTramites carga tramites segun sociedad y estado', async () => {
  const dependencies = createDependencies({
    listTramites: createMockFn(async (params) => ({
      data: {
        success: true,
        data: [
          { id: 9, estado: params.estado || 'sin_filtro' },
        ],
      },
    })),
  });
  const hook = createHookHarness({
    hook: useTramitesHarness,
    initialProps: {
      sociedadId: 18,
      estado: 'en_revision_tesoreria_2',
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });

  assert.deepEqual(dependencies.tramitesClient.listTramites.calls[0][0], {
    sociedadId: 18,
    estado: 'en_revision_tesoreria_2',
  });
  assert.deepEqual(hook.result.tramites, [
    { id: 9, estado: 'en_revision_tesoreria_2' },
  ]);
  assert.equal(hook.result.loading, false);
});

test('useTramites filtra facturas disponibles por estado operativo y acumula errores de carga', async () => {
  const dependencies = createDependencies({
    listAllFacturas: createMockFn(async () => ([
      { id: 1, estado: 'contabilizado' },
      { id: 2, estado_workflow_pago: 'pagado_parcialmente' },
      { id: 3, estado: 'no_contabilizado' },
    ])),
    getRetencionesDisponibles: createMockFn(async () => {
      throw {
        response: {
          status: 403,
        },
      };
    }),
  });
  const hook = createHookHarness({
    hook: useTramitesHarness,
    initialProps: {
      sociedadId: 18,
      estado: '',
      dependencies,
    },
  });

  await hook.flush({ cycles: 4 });
  await hook.result.fetchFacturasDisponibles();
  await hook.flush({ cycles: 6 });

  assert.deepEqual(
    hook.result.facturasDisponibles.map((factura) => factura.id),
    [1, 2],
  );
  assert.deepEqual(hook.result.retencionesDisponibles, []);
  assert.equal(hook.result.loadingDocs, false);
  assert.equal(
    hook.result.actionError,
    'No tienes permiso para ver retenciones pendientes.',
  );
});

test('useTramites oculta estado derivado cuando cambia de sociedad sin reset en effect', async () => {
  const dependencies = createDependencies({
    listTramites: createMockFn(async () => ({
      data: {
        success: true,
        data: [{ id: 7 }],
      },
    })),
    listAllFacturas: createMockFn(async () => ([{ id: 91, estado: 'contabilizado' }])),
  });
  const hook = createHookHarness({
    hook: useTramitesHarness,
    initialProps: {
      sociedadId: 18,
      estado: '',
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });
  await hook.result.fetchFacturasDisponibles();
  await hook.flush({ cycles: 6 });

  hook.result.setActionMessage('ok');
  hook.result.setActionError('error temporal');
  await hook.flush({ cycles: 2 });

  assert.deepEqual(hook.result.tramites, [{ id: 7 }]);
  assert.deepEqual(hook.result.facturasDisponibles, [{ id: 91, estado: 'contabilizado' }]);
  assert.equal(hook.result.actionMessage, 'ok');
  assert.equal(hook.result.actionError, 'error temporal');

  hook.rerender({
    sociedadId: '',
    estado: '',
    dependencies,
  });
  await hook.flush({ cycles: 3 });

  assert.deepEqual(hook.result.tramites, []);
  assert.deepEqual(hook.result.facturasDisponibles, []);
  assert.deepEqual(hook.result.retencionesDisponibles, []);
  assert.equal(hook.result.actionMessage, '');
  assert.equal(hook.result.actionError, '');
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.loadingDocs, false);
});
