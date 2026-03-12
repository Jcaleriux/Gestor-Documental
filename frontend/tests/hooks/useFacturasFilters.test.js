import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturasFilters } from '../../src/hooks/facturas/useFacturasFilters.js';
import { createHookHarness } from '../utils/hookHarness.js';

const useFacturasFiltersHarness = (props) => useFacturasFilters(props);

const buildFactura = ({ id, fechaEmision }) => ({
  id,
  fecha_emision: fechaEmision,
  consecutivo: `FAC-${id}`,
  emisor: { nombre: `Proveedor ${id}` },
  receptor: { nombre: 'Cliente' },
  resumen: {
    TotalComprobante: 1000,
    CodigoTipoMoneda: { CodigoMoneda: 'CRC' }
  },
  estado: 'no_contabilizado'
});

test('useFacturasFilters no incluye documentos del dia anterior al filtrar fecha desde', async () => {
  const facturas = [
    buildFactura({ id: 1, fechaEmision: '2026-01-30T23:59:59' }),
    buildFactura({ id: 2, fechaEmision: '2026-01-31T00:00:00' }),
    buildFactura({ id: 3, fechaEmision: '2026-01-31T12:30:00' })
  ];

  const hook = createHookHarness({
    hook: useFacturasFiltersHarness,
    initialProps: { facturas }
  });

  hook.result.setFechaDesde('2026-01-31');
  await hook.flush();

  assert.deepEqual(hook.result.filtradas.map((factura) => factura.id), [2, 3]);
});

test('useFacturasFilters incluye todo el dia seleccionado en fecha hasta', async () => {
  const facturas = [
    buildFactura({ id: 1, fechaEmision: '2026-01-31T00:00:00' }),
    buildFactura({ id: 2, fechaEmision: '2026-01-31T23:59:59' }),
    buildFactura({ id: 3, fechaEmision: '2026-02-01T00:00:00' })
  ];

  const hook = createHookHarness({
    hook: useFacturasFiltersHarness,
    initialProps: { facturas }
  });

  hook.result.setFechaHasta('2026-01-31');
  await hook.flush();

  assert.deepEqual(hook.result.filtradas.map((factura) => factura.id), [1, 2]);
});
