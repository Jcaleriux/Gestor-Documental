import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturaDetalleData } from '../../src/hooks/facturaDetalle/useFacturaDetalleData.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useFacturaDetalleDataHarness = (props) => useFacturaDetalleData(props);

test('useFacturaDetalleData carga datos usando facturaApi inyectado', async () => {
  const now = new Date('2026-02-18T12:00:00.000Z');
  const facturaApi = {
    getFactura: createMockFn(async () => ({
      data: {
        data: {
          id: 77,
          sociedad_id: 10,
          fecha_emision: '2026-01-20',
          emisor: {
            Identificacion: {
              Numero: '3101122334'
            }
          }
        }
      }
    })),
    getComentarios: createMockFn(async () => ({
      data: {
        data: [{ id: 1, texto: 'ok' }]
      }
    })),
    getEstados: createMockFn(async () => ({
      data: {
        data: [{ id: 1, estado_nuevo: 'contabilizado' }]
      }
    })),
    getContabilizacion: createMockFn(async () => ({
      data: {
        data: {
          retencion_pagos: [{ id: 11, monto: 10 }],
          proveedor_id: 5
        }
      }
    })),
    getProveedores: createMockFn(async () => ({
      data: {
        data: [{ id: 5, identificacion_numero: '3101122334' }]
      }
    }))
  };
  const centrosApi = {
    listCentros: createMockFn(async () => [])
  };

  const hook = createHookHarness({
    hook: useFacturaDetalleDataHarness,
    autoRunEffects: false,
    initialProps: {
      id: 77,
      sociedadId: 10,
      dependencies: {
        facturaApi,
        centrosApi,
        nowProvider: () => now
      }
    }
  });

  await hook.result.fetchAll();
  await hook.flush({ cycles: 10 });

  assert.equal(facturaApi.getFactura.calls.length, 1);
  assert.equal(facturaApi.getComentarios.calls.length, 1);
  assert.equal(facturaApi.getEstados.calls.length, 1);
  assert.equal(facturaApi.getContabilizacion.calls.length, 1);
  assert.equal(facturaApi.getProveedores.calls.length, 1);
  assert.equal(centrosApi.listCentros.calls.length, 1);

  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.factura.id, 77);
  assert.equal(hook.result.comentarios.length, 1);
  assert.equal(hook.result.estados.length, 1);
  assert.equal(hook.result.retencionPagos.length, 1);
  assert.equal(hook.result.proveedoresSociedad.length, 1);
  assert.equal(hook.result.retencionPagoFecha, '2026-02-18');
  assert.equal(hook.result.conta.proveedor_id, '5');
});

test('useFacturaDetalleData no llama API cuando falta id', async () => {
  const facturaApi = {
    getFactura: createMockFn(),
    getComentarios: createMockFn(),
    getEstados: createMockFn(),
    getContabilizacion: createMockFn(),
    getProveedores: createMockFn()
  };
  const centrosApi = {
    listCentros: createMockFn(async () => [])
  };

  const hook = createHookHarness({
    hook: useFacturaDetalleDataHarness,
    autoRunEffects: false,
    initialProps: {
      id: null,
      sociedadId: 10,
      dependencies: {
        facturaApi,
        centrosApi
      }
    }
  });

  await hook.result.fetchAll();
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.loading, false);
  assert.equal(facturaApi.getFactura.calls.length, 0);
  assert.equal(facturaApi.getComentarios.calls.length, 0);
  assert.equal(facturaApi.getEstados.calls.length, 0);
  assert.equal(facturaApi.getContabilizacion.calls.length, 0);
});

test('useFacturaDetalleData no relanza fetchAll en cada render cuando usa nowProvider por defecto', async () => {
  const facturaApi = {
    getFactura: createMockFn(async () => ({
      data: {
        data: {
          id: 88,
          sociedad_id: 10
        }
      }
    })),
    getComentarios: createMockFn(async () => ({
      data: {
        data: []
      }
    })),
    getEstados: createMockFn(async () => ({
      data: {
        data: []
      }
    })),
    getContabilizacion: createMockFn(async () => ({
      data: {
        data: {}
      }
    })),
    getProveedores: createMockFn(async () => ({
      data: {
        data: []
      }
    }))
  };
  const centrosApi = {
    listCentros: createMockFn(async () => [])
  };

  const hook = createHookHarness({
    hook: useFacturaDetalleDataHarness,
    initialProps: {
      id: 88,
      sociedadId: 10,
      dependencies: {
        facturaApi,
        centrosApi
      }
    }
  });

  await hook.flush({ cycles: 20 });

  assert.equal(facturaApi.getFactura.calls.length, 1);
  assert.equal(facturaApi.getComentarios.calls.length, 1);
  assert.equal(facturaApi.getEstados.calls.length, 1);
  assert.equal(facturaApi.getContabilizacion.calls.length, 1);
});
