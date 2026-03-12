import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentActions } from '../../src/hooks/facturaDetalle/documentActions.js';
import { createMockFn } from '../utils/mockFn.js';

const createFixture = ({
  factura = { has_mensaje_hacienda: true },
  tablaPagoActual = null,
  ordenCompraActual = null,
  notaCreditoActual = null,
  mensajeHaciendaResponse = { data: { data: { ruta_xml: 'documentos/mh.xml' } } }
} = {}) => {
  const buildAuthUrl = createMockFn((url) => `auth:${url}`);
  const openWindow = createMockFn();
  const setMhLoading = createMockFn();
  const setMhError = createMockFn();
  const facturaApi = {
    getMensajeHacienda: createMockFn(async () => mensajeHaciendaResponse)
  };

  const actions = createDocumentActions({
    id: 42,
    factura,
    tablaPagoActual,
    ordenCompraActual,
    notaCreditoActual,
    setMhLoading,
    setMhError,
    facturaApi,
    buildAuthUrl,
    openWindow
  });

  return {
    actions,
    buildAuthUrl,
    openWindow,
    setMhLoading,
    setMhError,
    facturaApi
  };
};

test('createDocumentActions.verNotaCreditoAsociada prioriza PDF sobre XML', () => {
  const { actions, buildAuthUrl, openWindow } = createFixture({
    notaCreditoActual: {
      ruta_pdf: 'docs/nota.pdf',
      ruta_xml: 'docs/nota.xml'
    }
  });

  actions.verNotaCreditoAsociada();

  assert.equal(buildAuthUrl.calls.length, 1);
  assert.equal(
    buildAuthUrl.calls[0][0],
    '/api/files/pdf?path=docs%2Fnota.pdf'
  );
  assert.deepEqual(openWindow.calls[0], [
    'auth:/api/files/pdf?path=docs%2Fnota.pdf',
    '_blank',
    'noopener,noreferrer'
  ]);
});

test('createDocumentActions.verNotaCreditoAsociada usa XML cuando no hay PDF', () => {
  const { actions, buildAuthUrl } = createFixture({
    notaCreditoActual: {
      ruta_xml: 'docs/nota.xml'
    }
  });

  actions.verNotaCreditoAsociada();

  assert.equal(buildAuthUrl.calls.length, 1);
  assert.equal(
    buildAuthUrl.calls[0][0],
    '/api/files/xml?path=docs%2Fnota.xml'
  );
});

test('createDocumentActions.verMensajeHacienda valida disponibilidad antes de API', async () => {
  const { actions, setMhError, facturaApi, setMhLoading } = createFixture({
    factura: { has_mensaje_hacienda: false }
  });

  await actions.verMensajeHacienda();

  assert.equal(facturaApi.getMensajeHacienda.calls.length, 0);
  assert.equal(setMhLoading.calls.length, 0);
  assert.equal(setMhError.calls.length, 1);
  assert.equal(
    setMhError.calls[0][0],
    'Esta factura aun no tiene Mensaje Hacienda registrado.'
  );
});

test('createDocumentActions.verMensajeHacienda abre XML y actualiza estado de carga', async () => {
  const {
    actions,
    facturaApi,
    setMhLoading,
    setMhError,
    buildAuthUrl,
    openWindow
  } = createFixture({
    factura: { has_mensaje_hacienda: true },
    mensajeHaciendaResponse: { data: { data: { ruta_xml: 'mensajes/mh-42.xml' } } }
  });

  await actions.verMensajeHacienda();

  assert.equal(facturaApi.getMensajeHacienda.calls.length, 1);
  assert.equal(facturaApi.getMensajeHacienda.calls[0][0], 42);
  assert.equal(setMhLoading.calls[0][0], true);
  assert.equal(setMhLoading.calls[1][0], false);
  assert.equal(setMhError.calls[0][0], '');
  assert.equal(
    buildAuthUrl.calls[0][0],
    '/api/files/xml?path=mensajes%2Fmh-42.xml'
  );
  assert.deepEqual(openWindow.calls[0], [
    'auth:/api/files/xml?path=mensajes%2Fmh-42.xml',
    '_blank',
    'noopener,noreferrer'
  ]);
});

test('createDocumentActions.verManifest abre endpoint autenticado del manifiesto', () => {
  const { actions, buildAuthUrl, openWindow } = createFixture();

  actions.verManifest();

  assert.equal(buildAuthUrl.calls.length, 1);
  assert.equal(buildAuthUrl.calls[0][0], '/api/facturas/42/manifest');
  assert.deepEqual(openWindow.calls[0], [
    'auth:/api/facturas/42/manifest',
    '_blank',
    'noopener,noreferrer'
  ]);
});

test('createDocumentActions.verTablaPagoAsociada y verOrdenCompraAsociada no hacen nada sin ruta', () => {
  const { actions, buildAuthUrl, openWindow } = createFixture({
    tablaPagoActual: {},
    ordenCompraActual: {}
  });

  actions.verTablaPagoAsociada();
  actions.verOrdenCompraAsociada();

  assert.equal(buildAuthUrl.calls.length, 0);
  assert.equal(openWindow.calls.length, 0);
});
