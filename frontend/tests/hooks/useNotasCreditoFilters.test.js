import test from 'node:test';
import assert from 'node:assert/strict';
import { useNotasCreditoFilters } from '../../src/hooks/notasCredito/useNotasCreditoFilters.js';
import { createHookHarness } from '../utils/hookHarness.js';

const useNotasCreditoFiltersHarness = (props) => useNotasCreditoFilters(props);

test('useNotasCreditoFilters construye query y reinicia pagina al cambiar filtros', async () => {
  const hook = createHookHarness({
    hook: useNotasCreditoFiltersHarness,
    initialProps: { debounceMs: 0 },
  });

  hook.result.setPage(4);
  hook.result.setSearch(' Proveedor QA ');
  hook.result.setEstado('disponible');
  hook.result.setMoneda('USD');
  await hook.flush({ cycles: 2 });

  assert.equal(hook.result.page, 1);
  assert.deepEqual(hook.result.query, {
    page: 1,
    pageSize: 50,
    sortBy: 'fecha_emision',
    sortDir: 'desc',
    search: 'Proveedor QA',
    estado: 'disponible',
    moneda: 'USD',
  });
});

test('useNotasCreditoFilters alterna orden y reinicia paginacion', async () => {
  const hook = createHookHarness({
    hook: useNotasCreditoFiltersHarness,
    initialProps: { debounceMs: 0 },
  });

  hook.result.setPage(3);
  hook.result.toggleSort('emisor');
  await hook.flush({ cycles: 2 });

  assert.equal(hook.result.page, 1);
  assert.equal(hook.result.sortBy, 'emisor');
  assert.equal(hook.result.sortDir, 'asc');

  hook.result.toggleSort('emisor');
  await hook.flush({ cycles: 2 });

  assert.equal(hook.result.sortDir, 'desc');
});
