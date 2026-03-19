import test from 'node:test';
import assert from 'node:assert/strict';
import { useDashboard } from '../../src/hooks/useDashboard.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useDashboardHarness = (props) => useDashboard(props);

test('useDashboard carga resumen y documentos recientes desde la API', async () => {
  const getStats = createMockFn(async () => ({
    data: {
      success: true,
      data: {
        totalFacturas: 12,
      },
    },
  }));
  const getRecentDocuments = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 1 }, { id: 2 }],
    },
  }));

  const hook = createHookHarness({
    hook: useDashboardHarness,
    initialProps: {
      sociedadId: 10,
      dependencies: {
        api: { getStats, getRecentDocuments },
      },
    },
  });

  await hook.flush({ cycles: 6 });

  assert.equal(getStats.calls.length, 1);
  assert.equal(getRecentDocuments.calls.length, 1);
  assert.deepEqual(hook.result.stats, { totalFacturas: 12 });
  assert.deepEqual(hook.result.recentDocs, [{ id: 1 }, { id: 2 }]);
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.loading, false);
});

test('useDashboard reinicia el estado cuando no hay sociedad seleccionada', async () => {
  const hook = createHookHarness({
    hook: useDashboardHarness,
    initialProps: {
      sociedadId: '',
      dependencies: {
        api: {
          getStats: createMockFn(async () => ({ data: { success: true, data: {} } })),
          getRecentDocuments: createMockFn(async () => ({ data: { success: true, data: [] } })),
        },
      },
    },
  });

  await hook.flush({ cycles: 3 });

  assert.deepEqual(hook.result.stats, {});
  assert.deepEqual(hook.result.recentDocs, []);
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.loading, false);
});

test('useDashboard expone error cuando el contrato del dashboard no es compatible', async () => {
  const hook = createHookHarness({
    hook: useDashboardHarness,
    initialProps: {
      sociedadId: 10,
      dependencies: {
        api: {
          getStats: createMockFn(async () => ({
            data: {
              success: true,
              data: [],
            },
          })),
          getRecentDocuments: createMockFn(async () => ({
            data: {
              success: true,
              data: [{ id: 5 }],
            },
          })),
        },
      },
    },
  });

  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.error, 'El backend de dashboard devolvio un resumen no compatible.');
  assert.deepEqual(hook.result.stats, {});
  assert.deepEqual(hook.result.recentDocs, []);
});
