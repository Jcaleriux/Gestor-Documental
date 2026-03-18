import test from 'node:test';
import assert from 'node:assert/strict';
import { useTiquetesElectronicos } from '../../src/hooks/useTiquetesElectronicos.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useTiquetesElectronicosHarness = (props) => useTiquetesElectronicos(props);

test('useTiquetesElectronicos consume el contrato paginado y expone items, meta y summary', async () => {
  const listTiquetesElectronicos = createMockFn(async () => ({
    data: {
      success: true,
      data: {
        items: [
          { id: 1, monto_total: 1200, moneda: 'CRC' }
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
          totalAmount: 1200,
          byMoneda: [{ moneda: 'CRC', totalItems: 1, totalAmount: 1200 }]
        }
      }
    }
  }));

  const hook = createHookHarness({
    hook: useTiquetesElectronicosHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      dependencies: {
        api: { listTiquetesElectronicos }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.equal(listTiquetesElectronicos.calls.length, 1);
  assert.equal(hook.result.items.length, 1);
  assert.equal(hook.result.meta.totalItems, 1);
  assert.equal(hook.result.summary.totalAmount, 1200);
  assert.equal(hook.result.error, '');
});

test('useTiquetesElectronicos expone error claro si el backend devuelve contrato legacy', async () => {
  const listTiquetesElectronicos = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 1 }]
    }
  }));

  const hook = createHookHarness({
    hook: useTiquetesElectronicosHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      dependencies: {
        api: { listTiquetesElectronicos }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.equal(
    hook.result.error,
    'El backend de tiquetes electronicos devolvio un formato no compatible. Reinicia o actualiza la API para usar el listado paginado.'
  );
  assert.equal(hook.result.items.length, 0);
});
