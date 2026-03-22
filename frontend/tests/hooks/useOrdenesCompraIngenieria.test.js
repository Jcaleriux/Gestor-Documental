import test from 'node:test';
import assert from 'node:assert/strict';
import { useOrdenesCompraIngenieria } from '../../src/hooks/ordenesCompra/useOrdenesCompraIngenieria.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useOrdenesCompraIngenieriaHarness = (props) => useOrdenesCompraIngenieria(props);

const baseProveedor = {
  id: 7,
  nombre: 'Proveedor Norte',
  identificacion_numero: '3101234567',
};

const baseOrden = {
  id: 33,
  proveedor_id: 7,
  nombre: 'OC-1001',
  estado: 'abierta',
  creado_en: '2026-03-10T10:00:00.000Z',
};

test('useOrdenesCompraIngenieria no llama API ni expone datos cuando falta sociedadId', async () => {
  const proveedoresClient = {
    listProveedores: createMockFn(async () => ({ data: { data: [] } })),
  };
  const ordenesClient = {
    listOrdenesCompra: createMockFn(async () => ({ data: { data: [] } })),
  };

  const hook = createHookHarness({
    hook: useOrdenesCompraIngenieriaHarness,
    initialProps: {
      sociedadId: '',
      dependencies: {
        proveedoresClient,
        ordenesClient,
        nowProvider: () => new Date('2026-03-22T00:00:00.000Z'),
      },
    },
  });

  await hook.flush({ cycles: 4 });

  assert.equal(proveedoresClient.listProveedores.calls.length, 0);
  assert.equal(ordenesClient.listOrdenesCompra.calls.length, 0);
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.estadoFilter, '');
  assert.deepEqual(hook.result.proveedoresOrdenados, []);
  assert.deepEqual(hook.result.proveedoresConOrdenes, []);
  assert.deepEqual(hook.result.autoFiles, []);
  assert.deepEqual(hook.result.autoResults, []);
});

test('useOrdenesCompraIngenieria carga datos y recarga al cambiar estadoFilter', async () => {
  const proveedoresClient = {
    listProveedores: createMockFn(async () => ({
      data: {
        data: [baseProveedor],
      },
    })),
  };
  const ordenesClient = {
    listOrdenesCompra: createMockFn(async ({ estado }) => ({
      data: {
        data: [{ ...baseOrden, estado: estado || 'abierta' }],
      },
    })),
  };

  const hook = createHookHarness({
    hook: useOrdenesCompraIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies: {
        proveedoresClient,
        ordenesClient,
        nowProvider: () => new Date('2026-03-22T00:00:00.000Z'),
      },
    },
  });

  await hook.flush({ cycles: 6 });

  assert.equal(proveedoresClient.listProveedores.calls.length, 1);
  assert.deepEqual(ordenesClient.listOrdenesCompra.calls[0][0], {
    sociedadId: 18,
    estado: undefined,
  });
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.proveedoresOrdenados.length, 1);
  assert.equal(hook.result.proveedoresConOrdenes.length, 1);

  hook.result.setEstadoFilter('cerrada');
  await hook.flush({ cycles: 6 });

  assert.equal(ordenesClient.listOrdenesCompra.calls.length, 2);
  assert.deepEqual(ordenesClient.listOrdenesCompra.calls[1][0], {
    sociedadId: 18,
    estado: 'cerrada',
  });
  assert.equal(hook.result.estadoFilter, 'cerrada');
});

test('useOrdenesCompraIngenieria oculta estado derivado cuando cambia la sociedad sin reset en effect', async () => {
  const proveedoresClient = {
    listProveedores: createMockFn(async () => ({
      data: {
        data: [baseProveedor],
      },
    })),
  };
  const ordenesClient = {
    listOrdenesCompra: createMockFn(async () => ({
      data: {
        data: [baseOrden],
      },
    })),
    autoImportOrdenCompra: createMockFn(async () => ({
      data: {
        data: {},
      },
    })),
  };

  const hook = createHookHarness({
    hook: useOrdenesCompraIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies: {
        proveedoresClient,
        ordenesClient,
        nowProvider: () => new Date('2026-03-22T00:00:00.000Z'),
      },
    },
  });

  await hook.flush({ cycles: 6 });

  hook.result.setEstadoFilter('cerrada');
  hook.result.onProveedorChange('7');
  hook.result.setOrdenNumero('1234');
  hook.result.setOrdenMonto('99.50');
  hook.result.setOrdenFecha('2026-03-18');
  hook.result.setOrdenFile({ name: 'oc.pdf', size: 1000 });
  hook.result.handleAutoFilesChange([
    { name: 'a.pdf', webkitRelativePath: 'folder/a.pdf', size: 1200 },
  ]);
  hook.result.setError('error temporal');
  await hook.flush({ cycles: 4 });

  hook.rerender({
    sociedadId: 25,
    dependencies: {
      proveedoresClient,
      ordenesClient,
      nowProvider: () => new Date('2026-03-22T00:00:00.000Z'),
    },
  });
  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.estadoFilter, '');
  assert.equal(hook.result.selectedProveedor, null);
  assert.equal(hook.result.ordenNumero, '');
  assert.equal(hook.result.ordenMonto, '');
  assert.equal(hook.result.ordenMoneda, 'CRC');
  assert.equal(hook.result.ordenFecha, '2026-03-22');
  assert.equal(hook.result.ordenFile, null);
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.message, '');
  assert.deepEqual(hook.result.autoFiles, []);
  assert.deepEqual(hook.result.autoResults, []);
});
