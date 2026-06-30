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

test('useOrdenesCompraIngenieria carga una orden manual y reinicia el formulario', async () => {
  const fileToBase64 = createMockFn(async () => 'PDF_BASE64');
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
    createOrdenCompra: createMockFn(async () => ({ data: { success: true } })),
  };

  const hook = createHookHarness({
    hook: useOrdenesCompraIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies: {
        proveedoresClient,
        ordenesClient,
        fileToBase64,
        nowProvider: () => new Date('2026-03-22T00:00:00.000Z'),
      },
    },
  });

  await hook.flush({ cycles: 6 });

  hook.result.onProveedorChange('7');
  hook.result.setOrdenNumero(' OC-2026-001 ');
  hook.result.setOrdenMonto('1500.25');
  hook.result.setOrdenMoneda('USD');
  hook.result.setOrdenFecha('2026-03-20');
  hook.result.setOrdenFile({ name: 'orden.pdf', size: 2048 });
  await hook.flush({ cycles: 4 });

  const event = { preventDefault: createMockFn() };
  await hook.result.handleUpload(event);
  await hook.flush({ cycles: 6 });

  assert.equal(event.preventDefault.calls.length, 1);
  assert.deepEqual(ordenesClient.createOrdenCompra.calls[0][0], {
    sociedad_id: 18,
    proveedor_id: 7,
    numero_oc: 'OC-2026-001',
    monto: 1500.25,
    moneda: 'USD',
    fecha: '2026-03-20',
    filename: 'orden.pdf',
    file_base64: 'PDF_BASE64',
  });
  assert.equal(fileToBase64.calls.length, 1);
  assert.equal(hook.result.message, 'Orden de compra cargada correctamente.');
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.ordenNumero, '');
  assert.equal(hook.result.ordenMonto, '');
  assert.equal(hook.result.ordenMoneda, 'CRC');
  assert.equal(hook.result.ordenFecha, '2026-03-22');
  assert.equal(hook.result.ordenFile, null);
  assert.equal(ordenesClient.listOrdenesCompra.calls.length, 2);
});

test('useOrdenesCompraIngenieria valida formulario y tamano antes de cargar manualmente', async () => {
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
    createOrdenCompra: createMockFn(async () => ({ data: { success: true } })),
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

  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 2 });
  assert.equal(hook.result.error, 'Seleccione un proveedor.');

  hook.result.onProveedorChange('7');
  await hook.flush({ cycles: 2 });
  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 2 });
  assert.equal(hook.result.error, 'Seleccione un archivo PDF.');

  hook.result.setOrdenFile({ name: 'grande.pdf', size: 11 * 1024 * 1024 });
  hook.result.setOrdenMonto('10');
  hook.result.setOrdenNumero('OC-1');
  await hook.flush({ cycles: 2 });
  await hook.result.handleUpload({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 2 });

  assert.match(hook.result.error, /tamano maximo permitido/);
  assert.equal(hook.result.ordenFile, null);
  assert.equal(ordenesClient.createOrdenCompra.calls.length, 0);
});

test('useOrdenesCompraIngenieria elimina y cambia estado manual refrescando datos', async () => {
  const confirmDelete = createMockFn(() => true);
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
    deleteOrdenCompra: createMockFn(async () => ({ data: { success: true } })),
    updateEstadoManual: createMockFn(async () => ({ data: { success: true } })),
  };

  const hook = createHookHarness({
    hook: useOrdenesCompraIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies: {
        proveedoresClient,
        ordenesClient,
        confirmDelete,
        nowProvider: () => new Date('2026-03-22T00:00:00.000Z'),
      },
    },
  });

  await hook.flush({ cycles: 6 });
  await hook.result.handleDeleteOrden({ id: 33, nombre: 'OC-1001' });
  await hook.flush({ cycles: 6 });

  assert.deepEqual(confirmDelete.calls[0], ['Desea eliminar la orden de compra "OC-1001"?']);
  assert.deepEqual(ordenesClient.deleteOrdenCompra.calls[0][0], {
    ordenCompraId: 33,
    sociedadId: 18,
  });
  assert.equal(hook.result.deletingId, null);
  assert.equal(hook.result.message, 'Orden de compra eliminada correctamente.');

  await hook.result.handleToggleEstadoManual({ id: 33, estado: 'cerrada' });
  await hook.flush({ cycles: 6 });

  assert.deepEqual(ordenesClient.updateEstadoManual.calls[0][0], {
    ordenCompraId: 33,
    sociedadId: 18,
    estado: 'abierta',
  });
  assert.equal(hook.result.updatingEstadoId, null);
  assert.equal(hook.result.message, 'Orden de compra abierta manualmente.');
  assert.equal(ordenesClient.listOrdenesCompra.calls.length, 3);
});

test('useOrdenesCompraIngenieria importa automaticamente PDFs y registra exitos y errores', async () => {
  const pdfOk = { name: 'ok.pdf', webkitRelativePath: 'oc/ok.pdf', size: 1000 };
  const pdfFail = { name: 'fail.pdf', webkitRelativePath: 'oc/fail.pdf', size: 1000 };
  const ignored = { name: 'nota.txt', size: 100 };
  const fileToBase64 = createMockFn(async (file) => `BASE64_${file.name}`);
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
    autoImportOrdenCompra: createMockFn(async (payload) => {
      if (payload.filename === 'fail.pdf') {
        const error = new Error('fallo');
        error.response = { data: { error: 'No se pudo interpretar la OC' } };
        throw error;
      }
      return {
        data: {
          data: {
            extraido: {
              numero_oc: 'OC-AUTO-1',
              proveedor_nombre: 'Proveedor Norte',
              moneda: 'CRC',
              monto: 2500,
              fecha: '2026-03-21',
            },
          },
        },
      };
    }),
  };

  const hook = createHookHarness({
    hook: useOrdenesCompraIngenieriaHarness,
    initialProps: {
      sociedadId: 18,
      dependencies: {
        proveedoresClient,
        ordenesClient,
        fileToBase64,
        nowProvider: () => new Date('2026-03-22T00:00:00.000Z'),
      },
    },
  });

  await hook.flush({ cycles: 6 });
  hook.result.handleAutoFilesChange([pdfOk, ignored, pdfFail]);
  await hook.flush({ cycles: 3 });

  assert.deepEqual(hook.result.autoFiles, [pdfOk, pdfFail]);

  await hook.result.handleAutoImport();
  await hook.flush({ cycles: 6 });

  assert.equal(fileToBase64.calls.length, 2);
  assert.deepEqual(ordenesClient.autoImportOrdenCompra.calls[0][0], {
    sociedad_id: 18,
    filename: 'ok.pdf',
    file_base64: 'BASE64_ok.pdf',
  });
  assert.equal(hook.result.autoImporting, false);
  assert.deepEqual(hook.result.autoResults, [
    {
      rowKey: 'oc/ok.pdf::0',
      filename: 'oc/ok.pdf',
      status: 'ok',
      numero_oc: 'OC-AUTO-1',
      proveedor: 'Proveedor Norte',
      moneda: 'CRC',
      monto: 2500,
      fecha: '2026-03-21',
    },
    {
      rowKey: 'oc/fail.pdf::1',
      filename: 'oc/fail.pdf',
      status: 'error',
      error: 'No se pudo interpretar la OC',
    },
  ]);
  assert.equal(hook.result.message, 'Importacion automatica finalizada. Exitosas: 1. Errores: 1.');
  assert.equal(ordenesClient.listOrdenesCompra.calls.length, 2);
});
