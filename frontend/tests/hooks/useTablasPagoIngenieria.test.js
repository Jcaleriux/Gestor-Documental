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
  createTablaPago = createMockFn(async () => ({
    data: {
      success: true,
    },
  })),
  deleteTablaPago = createMockFn(async () => ({
    data: {
      success: true,
    },
  })),
  fileToBase64 = createMockFn(async () => 'PDF_BASE64'),
  confirmDelete = createMockFn(() => true),
} = {}) => ({
  proveedoresClient: {
    listProveedores,
  },
  tablasPagoClient: {
    listTablasPago,
    createTablaPago,
    deleteTablaPago,
  },
  fileToBase64,
  confirmDelete,
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

test('useTablasPagoIngenieria agrupa tablas por proveedor y ordena por nombre y fecha', async () => {
  const proveedorAlfa = {
    id: 8,
    nombre: 'Proveedor Alfa',
    identificacion_numero: '3101000008',
  };
  const proveedorZeta = {
    id: 9,
    nombre: 'Proveedor Zeta',
    identificacion_numero: '3101000009',
  };
  const dependencies = createDependencies({
    listProveedores: createMockFn(async () => ({
      data: {
        data: [proveedorZeta, proveedorAlfa],
      },
    })),
    listTablasPago: createMockFn(async () => ({
      data: {
        data: [
          { id: 91, proveedor_id: 9, nombre: 'Tabla vieja', creado_en: '2026-02-01T00:00:00.000Z' },
          { id: 81, proveedor_id: 8, nombre: 'Tabla alfa', creado_en: '2026-03-01T00:00:00.000Z' },
          { id: 92, proveedor_id: 9, nombre: 'Tabla nueva', creado_en: '2026-04-01T00:00:00.000Z' },
        ],
      },
    })),
  });
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });

  assert.deepEqual(
    hook.result.proveedoresConTablas.map((grupo) => grupo.proveedorId),
    [8, 9]
  );
  assert.deepEqual(
    hook.result.proveedoresConTablas[1].tablas.map((tabla) => tabla.id),
    [92, 91]
  );
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

test('useTablasPagoIngenieria filtra proveedores y limpia seleccion si cambia el texto', async () => {
  const proveedorSur = {
    id: 8,
    nombre: 'Proveedor Sur',
    identificacion_numero: '3107654321',
    nombre_comercial: 'Servicios Especiales',
  };
  const dependencies = createDependencies({
    listProveedores: createMockFn(async () => ({
      data: {
        data: [baseProveedor, proveedorSur],
      },
    })),
  });
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });

  hook.result.onProveedorInputChange('especiales');
  await hook.flush({ cycles: 3 });

  assert.equal(hook.result.showProveedorList, true);
  assert.deepEqual(hook.result.filteredProveedores.map((proveedor) => proveedor.id), [8]);

  hook.result.onProveedorSelect(proveedorSur);
  await hook.flush({ cycles: 3 });
  assert.equal(hook.result.selectedProveedor.id, 8);
  assert.equal(hook.result.proveedorQuery, 'Proveedor Sur - 3107654321');

  hook.result.onProveedorInputChange('Proveedor Norte');
  await hook.flush({ cycles: 3 });

  assert.equal(hook.result.selectedProveedor, null);
  assert.equal(hook.result.proveedorQuery, 'Proveedor Norte');
});

test('useTablasPagoIngenieria sube una tabla y reinicia nombre y archivo', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });

  hook.result.onProveedorSelect(baseProveedor);
  hook.result.setTablaNombre(' Tabla Abril ');
  hook.result.setTablaFile({ name: 'tabla-abril.pdf', size: 2048 });
  await hook.flush({ cycles: 4 });

  const event = { preventDefault: createMockFn() };
  await hook.result.handleUpload(event);
  await hook.flush({ cycles: 6 });

  assert.equal(event.preventDefault.calls.length, 1);
  assert.deepEqual(dependencies.tablasPagoClient.createTablaPago.calls[0][0], {
    sociedad_id: 18,
    proveedor_id: 7,
    nombre: 'Tabla Abril',
    filename: 'tabla-abril.pdf',
    file_base64: 'PDF_BASE64',
  });
  assert.equal(dependencies.fileToBase64.calls.length, 1);
  assert.equal(hook.result.message, 'Tabla de pago cargada correctamente.');
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.saving, false);
  assert.equal(hook.result.tablaNombre, '');
  assert.equal(hook.result.tablaFile, null);
  assert.equal(dependencies.tablasPagoClient.listTablasPago.calls.length, 2);
});

test('useTablasPagoIngenieria valida proveedor, archivo y tamano antes de subir', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });

  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 2 });
  assert.equal(hook.result.error, 'Seleccione un proveedor.');

  hook.result.onProveedorSelect(baseProveedor);
  await hook.flush({ cycles: 2 });
  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 2 });
  assert.equal(hook.result.error, 'Seleccione un archivo PDF.');

  hook.result.setTablaFile({ name: 'tabla-grande.pdf', size: 11 * 1024 * 1024 });
  await hook.flush({ cycles: 2 });
  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 2 });

  assert.match(hook.result.error, /tamano maximo permitido/);
  assert.equal(hook.result.tablaFile, null);
  assert.equal(dependencies.tablasPagoClient.createTablaPago.calls.length, 0);
});

test('useTablasPagoIngenieria elimina una tabla confirmada y refresca datos', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });
  await hook.result.handleDeleteTabla(baseTabla);
  await hook.flush({ cycles: 6 });

  assert.deepEqual(dependencies.confirmDelete.calls[0], ['Desea eliminar la tabla de pago "Tabla Marzo"?']);
  assert.deepEqual(dependencies.tablasPagoClient.deleteTablaPago.calls[0][0], {
    tablaPagoId: 33,
    sociedadId: 18,
  });
  assert.equal(hook.result.deletingId, null);
  assert.equal(hook.result.message, 'Tabla de pago eliminada correctamente.');
  assert.equal(dependencies.tablasPagoClient.listTablasPago.calls.length, 2);
});

test('useTablasPagoIngenieria no elimina si falta id o el usuario cancela', async () => {
  const dependencies = createDependencies({
    confirmDelete: createMockFn(() => false),
  });
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });
  await hook.result.handleDeleteTabla(null);
  await hook.result.handleDeleteTabla(baseTabla);
  await hook.flush({ cycles: 3 });

  assert.equal(dependencies.confirmDelete.calls.length, 1);
  assert.equal(dependencies.tablasPagoClient.deleteTablaPago.calls.length, 0);
});

test('useTablasPagoIngenieria protege acciones cuando falta sociedad', async () => {
  const dependencies = createDependencies();
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: '',
      dependencies,
    },
  });

  await hook.flush({ cycles: 4 });
  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.result.handleDeleteTabla(baseTabla);
  await hook.flush({ cycles: 3 });

  assert.equal(dependencies.tablasPagoClient.createTablaPago.calls.length, 0);
  assert.equal(dependencies.confirmDelete.calls.length, 0);
  assert.equal(dependencies.tablasPagoClient.deleteTablaPago.calls.length, 0);
});

test('useTablasPagoIngenieria expone errores de carga y acciones', async () => {
  const loadError = new Error('fallo de carga');
  loadError.response = { data: { error: 'Error cargando tablas' } };
  const uploadError = new Error('fallo de upload');
  uploadError.response = { data: { error: 'Archivo duplicado' } };
  const deleteError = new Error('fallo de delete');
  deleteError.response = { data: { error: 'No se puede eliminar' } };

  const dependencies = createDependencies({
    listTablasPago: createMockFn(async () => {
      throw loadError;
    }),
    createTablaPago: createMockFn(async () => {
      throw uploadError;
    }),
    deleteTablaPago: createMockFn(async () => {
      throw deleteError;
    }),
  });
  const hook = createHookHarness({
    hook: useTablasPagoIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies,
    },
  });

  await hook.flush({ cycles: 6 });
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.error, 'Error cargando tablas');

  hook.result.onProveedorSelect(baseProveedor);
  hook.result.setTablaFile({ name: 'tabla.pdf', size: 1000 });
  await hook.flush({ cycles: 3 });
  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 3 });
  assert.equal(hook.result.error, 'Archivo duplicado');
  assert.equal(hook.result.saving, false);

  await hook.result.handleDeleteTabla(baseTabla);
  await hook.flush({ cycles: 3 });
  assert.equal(hook.result.error, 'No se puede eliminar');
  assert.equal(hook.result.deletingId, null);
});
