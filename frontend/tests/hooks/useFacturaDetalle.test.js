import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturaDetalle } from '../../src/hooks/useFacturaDetalle.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useFacturaDetalleHarness = (props) => useFacturaDetalle(props);

const setLocalStorageMock = ({ token = '' } = {}) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      if (key === 'novogar_auth_token') return token;
      return null;
    },
    setItem() {},
    removeItem() {}
  };

  return () => {
    globalThis.localStorage = previous;
  };
};

test('useFacturaDetalle compone dataDependencies y actionDependencies', async () => {
  const restore = setLocalStorageMock({ token: 'token-hook' });
  const now = new Date('2026-02-18T09:00:00.000Z');

  const dataFacturaApi = {
    getFactura: createMockFn(async () => ({
      data: {
        data: {
          id: 101,
          sociedad_id: 10,
          estado: 'en_revision',
          has_mensaje_hacienda: true
        }
      }
    })),
    getComentarios: createMockFn(async () => ({
      data: {
        data: [{ id: 1, texto: 'desde data api' }]
      }
    })),
    getEstados: createMockFn(async () => ({
      data: {
        data: [{ id: 1, estado_nuevo: 'en_revision' }]
      }
    })),
    getContabilizacion: createMockFn(async () => ({
      data: {
        data: {
          retencion_pagos: [{ id: 1, monto: 250 }]
        }
      }
    })),
    getProveedores: createMockFn(async () => ({
      data: {
        data: []
      }
    }))
  };

  const actionFacturaApi = {
    saveContabilizacion: createMockFn(async () => ({})),
    registrarPagoRetencion: createMockFn(async () => ({})),
    getTablasPago: createMockFn(async () => ({ data: { data: [] } })),
    getNotasCredito: createMockFn(async () => ({ data: { data: [] } })),
    addComentario: createMockFn(async () => ({})),
    getComentarios: createMockFn(async () => ({ data: { data: [] } })),
    addEstado: createMockFn(async () => ({})),
    patchEstado: createMockFn(async () => ({})),
    getMensajeHacienda: createMockFn(async () => ({
      data: {
        data: {
          ruta_xml: 'documentos/mensajes/mh-101.xml'
        }
      }
    }))
  };

  const buildAuthUrl = createMockFn((url) => `auth:${url}`);
  const openWindow = createMockFn();
  const centrosApi = {
    listCentros: createMockFn(async () => [])
  };

  try {
    const hook = createHookHarness({
      hook: useFacturaDetalleHarness,
      initialProps: {
        id: 101,
        sociedadId: 10,
        dataDependencies: {
          facturaApi: dataFacturaApi,
          centrosApi,
          nowProvider: () => now
        },
        actionDependencies: {
          facturaApi: actionFacturaApi,
          buildAuthUrl,
          openWindow
        }
      }
    });

    await hook.flush({ cycles: 20 });

    assert.equal(dataFacturaApi.getFactura.calls.length, 1);
    assert.equal(dataFacturaApi.getComentarios.calls.length, 1);
    assert.equal(dataFacturaApi.getEstados.calls.length, 1);
    assert.equal(dataFacturaApi.getContabilizacion.calls.length, 1);
    assert.equal(dataFacturaApi.getProveedores.calls.length, 1);

    assert.equal(actionFacturaApi.getComentarios.calls.length, 0);
    assert.equal(hook.result.meta.factura.id, 101);
    assert.equal(hook.result.meta.comentarios.length, 1);
    assert.equal(hook.result.meta.estados.length, 1);
    assert.equal(hook.result.state.retencion.retencionPagos.length, 1);
    assert.equal(hook.result.state.retencion.retencionPagoFecha, '2026-02-18');
    assert.equal(hook.result.viewModels.summary.factura.id, 101);
    assert.equal(hook.result.viewModels.pdf.pdfUrl, '');

    await hook.result.actions.verMensajeHacienda();

    assert.equal(actionFacturaApi.getMensajeHacienda.calls.length, 1);
    assert.equal(actionFacturaApi.getMensajeHacienda.calls[0][0], 101);
    assert.equal(buildAuthUrl.calls.length, 1);
    assert.equal(
      buildAuthUrl.calls[0][0],
      '/api/files/xml?path=documentos%2Fmensajes%2Fmh-101.xml'
    );
    assert.deepEqual(openWindow.calls[0], [
      'auth:/api/files/xml?path=documentos%2Fmensajes%2Fmh-101.xml',
      '_blank',
      'noopener,noreferrer'
    ]);

    hook.result.actions.verManifest();

    assert.equal(buildAuthUrl.calls.length, 2);
    assert.equal(buildAuthUrl.calls[1][0], '/api/facturas/101/manifest');
    assert.deepEqual(openWindow.calls[1], [
      'auth:/api/facturas/101/manifest',
      '_blank',
      'noopener,noreferrer'
    ]);
  } finally {
    restore();
  }
});
