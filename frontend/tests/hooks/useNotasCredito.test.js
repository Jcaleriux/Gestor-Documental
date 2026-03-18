import test from 'node:test';
import assert from 'node:assert/strict';
import { useNotasCredito } from '../../src/hooks/useNotasCredito.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useNotasCreditoHarness = (props) => useNotasCredito(props);

test('useNotasCredito consume el contrato paginado y expone items, meta y summary', async () => {
  const listNotasCredito = createMockFn(async () => ({
    data: {
      success: true,
      data: {
        items: [
          { id: 1, estado: 'disponible', saldo_disponible: 900 }
        ],
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
          totalAmount: 1000,
          totalSaldoDisponible: 900,
          byEstado: [{ estado: 'disponible', totalItems: 1, totalAmount: 1000, totalSaldoDisponible: 900 }],
          byMoneda: [{ moneda: 'CRC', totalItems: 1, totalAmount: 1000, totalSaldoDisponible: 900 }]
        }
      }
    }
  }));

  const hook = createHookHarness({
    hook: useNotasCreditoHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      dependencies: {
        api: { listNotasCredito }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.equal(listNotasCredito.calls.length, 1);
  assert.equal(hook.result.items.length, 1);
  assert.equal(hook.result.meta.totalItems, 1);
  assert.equal(hook.result.summary.totalSaldoDisponible, 900);
  assert.equal(hook.result.error, '');
});

test('useNotasCredito expone error claro si el backend devuelve contrato legacy', async () => {
  const listNotasCredito = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 1 }]
    }
  }));

  const hook = createHookHarness({
    hook: useNotasCreditoHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      dependencies: {
        api: { listNotasCredito }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.equal(
    hook.result.error,
    'El backend de notas de credito devolvio un formato no compatible. Reinicia o actualiza la API para usar el listado paginado.'
  );
  assert.equal(hook.result.items.length, 0);
});
