import test from 'node:test';
import assert from 'node:assert/strict';
import { useTablasPagoIngenieria } from '../../src/hooks/tablasPago/useTablasPagoIngenieria.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useTablasPagoIngenieriaHarness = (props) => useTablasPagoIngenieria(props);

const baseProveedor = {
  id: 7,
  nombre: 'Proveedor Norte',
  identificacion_numero: '3101234567',
};

const baseTabla = {
  id: 33,
  proveedor_id: 7,
  nombre: 'Tabla Marzo',
  creado_en: '2026-03-10T10:00:00.000Z',
};

const createDependencies = ({
  listProveedores = createMockFn(async () => ({
    data: {
      data: [baseProveedor],
    },
  })),
  listTablasPago = createMockFn(async () => ({
    data: {
      data: [baseTabla],
    },
  })),
} = {}) => ({
  proveedoresClient: {
    listProveedores,
  },
  tablasPagoClient: {
    listTablasPago,
    createTablaPago: createMockFn(async () => ({
      data: {
        success: true,
      },
    })),
    deleteTablaPago: createMockFn(async () => ({
      data: {
        success: true,
      },
    })),
  },
  confirmDelete: () => true,
});

test('useTablasPagoIngenieria no llama API ni expone datos cuando falta sociedadId', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: '',
      dependencies,
    },
  });

  await hook.flush({ cycles: 4 });

  assert.equal(dependencies.proveedoresClient.listProveedores.calls.length, 0);
  assert.equal(dependencies.tablasPagoClient.listTablasPago.calls.length, 0);
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.proveedorQuery, '');
  assert.equal(hook.result.showProveedorList, false);
  assert.equal(hook.result.selectedProveedor, null);
  assert.deepEqual(hook.result.filteredProveedores, []);
  assert.deepEqual(hook.result.proveedoresConTablas, []);
});

test('useTablasPagoIngenieria carga proveedores y tablas por sociedad', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });

  assert.equal(dependencies.proveedoresClient.listProveedores.calls.length, 1);
  assert.equal(dependencies.tablasPagoClient.listTablasPago.calls.length, 1);
  assert.equal(dependencies.proveedoresClient.listProveedores.calls[0][0], 18);
  assert.deepEqual(dependencies.tablasPagoClient.listTablasPago.calls[0][0], {
    sociedadId: 18,
  });
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.filteredProveedores.length, 1);
  assert.equal(hook.result.proveedoresConTablas.length, 1);
  assert.equal(hook.result.proveedoresConTablas[0].proveedorId, 7);
});

test('useTablasPagoIngenieria oculta estado derivado cuando cambia la sociedad sin reset en effect', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });

  hook.result.setShowProveedorList(true);
  hook.result.onProveedorSelect(baseProveedor);
  hook.result.setTablaNombre('Tabla Abril');
  hook.result.setTablaFile({ name: 'tabla.pdf', size: 1000 });
  hook.result.setError('error temporal');
  await hook.flush({ cycles: 3 });

  hook.rerender({
    sociedadId: 25,
    dependencies,
  });
  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.proveedorQuery, '');
  assert.equal(hook.result.showProveedorList, false);
  assert.equal(hook.result.selectedProveedor, null);
  assert.equal(hook.result.tablaNombre, '');
  assert.equal(hook.result.tablaFile, null);
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.message, '');
  assert.equal(hook.result.filteredProveedores.length, 1);
  assert.equal(hook.result.proveedoresConTablas.length, 1);
});
