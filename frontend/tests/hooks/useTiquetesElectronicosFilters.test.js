import test from 'node:test';
import assert from 'node:assert/strict';
import { useTiquetesElectronicosFilters } from '../../src/hooks/tiquetes/useTiquetesElectronicosFilters.js';
import { createHookHarness } from '../utils/hookHarness.js';

const useTiquetesElectronicosFiltersHarness = (props) => useTiquetesElectronicosFilters(props);

test('useTiquetesElectronicosFilters construye query y reinicia pagina al cambiar filtros', async () => {
  const hook = createHookHarness({
    hook: useTiquetesElectronicosFiltersHarness,
    initialProps: { debounceMs: 0 },
  });

  hook.result.setPage(4);
  hook.result.setSearch(' Proveedor QA ');
  hook.result.setMoneda('CRC');
  hook.result.setEmisorNombre('Acme');
  await hook.flush({ cycles: 2 });

  assert.equal(hook.result.page, 1);
  assert.deepEqual(hook.result.query, {
    page: 1,
    pageSize: 50,
    sortBy: 'fecha_emision',
    sortDir: 'desc',
    search: 'Proveedor QA',
    emisor: 'Acme',
    moneda: 'CRC',
  });
});

test('useTiquetesElectronicosFilters alterna orden y reinicia paginacion', async () => {
  const hook = createHookHarness({
    hook: useTiquetesElectronicosFiltersHarness,
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
