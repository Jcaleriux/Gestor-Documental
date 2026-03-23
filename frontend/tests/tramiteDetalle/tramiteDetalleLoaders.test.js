import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  fetchTramiteDetalleData,
  fetchTramiteHistorialData,
  fetchTramiteSociedadInfo
} from '../../src/hooks/tramiteDetalle/tramiteDetalleLoaders.js';

test('fetchTramiteDetalleData mapea tramite/documentos/retenciones cuando success=true', async () => {
  const api = {
    getDetalle: createMockFn(async () => ({
      data: {
        success: true,
        data: {
          tramite: { id: 101, estado: 'en_aprobacion_gerencia' },
          documentos: [{ factura_id: 1 }],
          retenciones: [{ id: 10 }],
          caratula: { id: 88, estado: 'procesada' },
          provider_groups: [{ group_key: 'group_1' }],
          orphan_groups: [{ orphan_id: 5 }]
        }
      }
    }))
  };

  const data = await fetchTramiteDetalleData({ api, id: 101 });

  assert.equal(api.getDetalle.calls.length, 1);
  assert.deepEqual(api.getDetalle.calls[0], [101]);
  assert.deepEqual(data, {
    tramite: { id: 101, estado: 'en_aprobacion_gerencia' },
    documentos: [{ factura_id: 1 }],
    retenciones: [{ id: 10 }],
    caratula: { id: 88, estado: 'procesada' },
    providerGroups: [{ group_key: 'group_1' }],
    orphanGroups: [{ orphan_id: 5 }]
  });
});

test('fetchTramiteDetalleData retorna defaults cuando success=false', async () => {
  const api = {
    getDetalle: createMockFn(async () => ({
      data: {
        success: false
      }
    }))
  };

  const data = await fetchTramiteDetalleData({ api, id: 202 });

  assert.deepEqual(data, {
    tramite: null,
    documentos: [],
    retenciones: [],
    caratula: null,
    providerGroups: [],
    orphanGroups: []
  });
});

test('fetchTramiteHistorialData y fetchTramiteSociedadInfo retornan listas y match esperado', async () => {
  const api = {
    getHistorial: createMockFn(async () => ({
      data: {
        success: true,
        data: [{ id: 1 }, { id: 2 }]
      }
    })),
    getSociedades: createMockFn(async () => ({
      data: {
        success: true,
        data: [{ id: 7, nombre_proyecto: 'Sociedad 7' }, { id: 9, nombre_proyecto: 'Sociedad 9' }]
      }
    }))
  };

  const historial = await fetchTramiteHistorialData({ api, id: 55 });
  const sociedad = await fetchTramiteSociedadInfo({ api, sociedadId: '9' });

  assert.equal(api.getHistorial.calls.length, 1);
  assert.equal(api.getSociedades.calls.length, 1);
  assert.deepEqual(historial, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(sociedad, { id: 9, nombre_proyecto: 'Sociedad 9' });
});
