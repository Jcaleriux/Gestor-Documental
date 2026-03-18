import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturasFilters } from '../../src/hooks/facturas/useFacturasFilters.js';
import { createHookHarness } from '../utils/hookHarness.js';

const useFacturasFiltersHarness = (props) => useFacturasFilters(props);

const buildNotaCredito = ({ id, fechaEmision }) => ({
  id,
  fecha_emision: fechaEmision,
  numero_consecutivo: `NC-${id}`,
  clave: `CLAVE-${id}`,
  emisor: { nombre: `Proveedor ${id}` },
  resumen: {
    TotalComprobante: 1000,
    CodigoTipoMoneda: { CodigoMoneda: 'CRC' }
  }
});

test('useFacturasFilters construye query para backend y reinicia pagina al cambiar filtros', async () => {
  const hook = createHookHarness({
    hook: useFacturasFiltersHarness,
    initialProps: { debounceMs: 0 }
  });

  hook.result.setPage(4);
  hook.result.setSearch(' Proveedor QA ');
  hook.result.setEstado('contabilizado');
  hook.result.setMoneda('CRC');
  await hook.flush({ cycles: 2 });

  assert.equal(hook.result.page, 1);
  assert.deepEqual(hook.result.query, {
    page: 1,
    pageSize: 50,
    sortBy: 'fecha_emision',
    sortDir: 'desc',
    search: 'Proveedor QA',
    estado: 'contabilizado',
    moneda: 'CRC'
  });
});

test('useFacturasFilters alterna direccion de orden y reinicia paginacion', async () => {
  const hook = createHookHarness({
    hook: useFacturasFiltersHarness,
    initialProps: { debounceMs: 0 }
  });

  hook.result.setPage(3);
  hook.result.toggleSort('emisor');
  await hook.flush();

  assert.equal(hook.result.page, 1);
  assert.equal(hook.result.sortBy, 'emisor');
  assert.equal(hook.result.sortDir, 'asc');

  hook.result.toggleSort('emisor');
  await hook.flush();

  assert.equal(hook.result.sortDir, 'desc');
});

test('useFacturasFilters incluye todo el dia seleccionado en fecha hasta para notas de credito del reporte', async () => {
  const notas = [
    buildNotaCredito({ id: 1, fechaEmision: '2026-01-31T00:00:00' }),
    buildNotaCredito({ id: 2, fechaEmision: '2026-01-31T23:59:59' }),
    buildNotaCredito({ id: 3, fechaEmision: '2026-02-01T00:00:00' })
  ];

  const hook = createHookHarness({
    hook: useFacturasFiltersHarness,
    initialProps: { debounceMs: 0 }
  });

  hook.result.setFechaHasta('2026-01-31');
  await hook.flush();

  assert.deepEqual(
    notas.filter((nota) => hook.result.filterNotaCreditoForReport(nota)).map((nota) => nota.id),
    [1, 2]
  );
});
