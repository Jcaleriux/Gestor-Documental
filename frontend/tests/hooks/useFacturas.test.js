import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturas } from '../../src/hooks/useFacturas.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useFacturasHarness = (props) => useFacturas(props);

test('useFacturas carga items, meta y summary desde el endpoint paginado', async () => {
  const listFacturas = createMockFn(async () => ({
    data: {
      success: true,
      data: {
        items: [{ id: 1 }, { id: 2 }],
        meta: {
          page: 2,
          pageSize: 50,
          totalItems: 120,
          totalPages: 3,
          hasNext: true,
          hasPrev: true,
          sortBy: 'emisor',
          sortDir: 'asc'
        },
        summary: {
          totalItems: 120,
          totalAmount: 5000,
          byEstado: [{ estado: 'contabilizado', totalItems: 80, totalAmount: 3000 }],
          byMoneda: [{ moneda: 'CRC', totalItems: 120, totalAmount: 5000 }]
        }
      }
    }
  }));

  const hook = createHookHarness({
    hook: useFacturasHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 2, pageSize: 50, sortBy: 'emisor', sortDir: 'asc' },
      dependencies: {
        api: { listFacturas }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.equal(listFacturas.calls.length, 1);
  assert.deepEqual(hook.result.items, [{ id: 1 }, { id: 2 }]);
  assert.equal(hook.result.meta.totalItems, 120);
  assert.equal(hook.result.summary.totalAmount, 5000);
  assert.equal(hook.result.error, '');
});

test('useFacturas expone error y permite reintentar', async () => {
  let shouldFail = true;
  const listFacturas = createMockFn(async () => {
    if (shouldFail) {
      const error = new Error('fallo');
      error.response = { data: { error: 'Backend caido' } };
      throw error;
    }

    return {
      data: {
        success: true,
        data: {
          items: [{ id: 9 }],
          meta: {
            page: 1,
            pageSize: 50,
            totalItems: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
            sortBy: 'fecha_emision',
            sortDir: 'desc'
          },
          summary: {
            totalItems: 1,
            totalAmount: 100,
            byEstado: [],
            byMoneda: []
          }
        }
      }
    };
  });

  const hook = createHookHarness({
    hook: useFacturasHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      dependencies: {
        api: { listFacturas }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.error, 'Backend caido');
  assert.deepEqual(hook.result.items, []);

  shouldFail = false;
  await hook.result.refetch();
  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.error, '');
  assert.deepEqual(hook.result.items, [{ id: 9 }]);
});

test('useFacturas rechaza el contrato legacy de facturas para evitar estados ambiguos', async () => {
  const listFacturas = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 1 }, { id: 2 }]
    }
  }));

  const hook = createHookHarness({
    hook: useFacturasHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      dependencies: {
        api: { listFacturas }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.equal(
    hook.result.error,
    'El backend de facturas devolvio un formato no compatible. Reinicia o actualiza la API para usar el listado paginado.'
  );
  assert.deepEqual(hook.result.items, []);
  assert.equal(hook.result.meta.totalItems, 0);
});
