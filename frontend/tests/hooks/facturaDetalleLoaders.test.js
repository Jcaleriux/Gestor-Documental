import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  fetchFacturaDetalleBundle,
  fetchFacturaDetalleData,
  fetchProveedoresForFactura
} from '../../src/hooks/facturaDetalle/facturaDetalleLoaders.js';

test('fetchFacturaDetalleBundle normaliza respuestas de factura/comentarios/estados/contabilizacion', async () => {
  const facturaApi = {
    getFactura: createMockFn(async () => ({ data: { data: { id: 12, sociedad_id: 3 } } })),
    getComentarios: createMockFn(async () => ({ data: { data: [{ id: 1 }] } })),
    getEstados: createMockFn(async () => ({ data: { data: [{ id: 2 }] } })),
    getContabilizacion: createMockFn(async () => ({ data: { data: { proveedor_id: 8 } } }))
  };

  const data = await fetchFacturaDetalleBundle({ id: 12, facturaApi });

  assert.deepEqual(data, {
    facturaData: { id: 12, sociedad_id: 3 },
    comentariosData: [{ id: 1 }],
    estadosData: [{ id: 2 }],
    contaData: { proveedor_id: 8 }
  });
});

test('fetchProveedoresForFactura retorna [] cuando no hay sociedad o hay error de API', async () => {
  const facturaApi = {
    getProveedores: createMockFn(async () => {
      throw new Error('network');
    })
  };

  const noSociedad = await fetchProveedoresForFactura({ facturaApi, sociedadId: null });
  const conError = await fetchProveedoresForFactura({ facturaApi, sociedadId: 9 });

  assert.deepEqual(noSociedad, []);
  assert.deepEqual(conError, []);
  assert.equal(facturaApi.getProveedores.calls.length, 1);
  assert.deepEqual(facturaApi.getProveedores.calls[0], [9]);
});

test('fetchFacturaDetalleData compone bundle + proveedores de la sociedad de la factura', async () => {
  const facturaApi = {
    getFactura: createMockFn(async () => ({ data: { data: { id: 99, sociedad_id: 21 } } })),
    getComentarios: createMockFn(async () => ({ data: { data: [] } })),
    getEstados: createMockFn(async () => ({ data: { data: [] } })),
    getContabilizacion: createMockFn(async () => ({ data: { data: {} } })),
    getProveedores: createMockFn(async () => ({ data: { data: [{ id: 5 }] } }))
  };

  const data = await fetchFacturaDetalleData({ id: 99, facturaApi });

  assert.equal(facturaApi.getProveedores.calls.length, 1);
  assert.deepEqual(facturaApi.getProveedores.calls[0], [21]);
  assert.deepEqual(data, {
    facturaData: { id: 99, sociedad_id: 21 },
    comentariosData: [],
    estadosData: [],
    contaData: {},
    proveedoresData: [{ id: 5 }]
  });
});
