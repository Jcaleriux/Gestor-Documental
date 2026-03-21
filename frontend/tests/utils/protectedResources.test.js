import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEW_TAB_FEATURES,
  openProtectedInNewTab,
} from '../../src/utils/protectedResources.js';
import { createMockFn } from '../utils/mockFn.js';

const createHeadersMock = (entries = {}) => ({
  get(name) {
    return entries[name.toLowerCase()] || entries[name] || '';
  },
});

const createFetchResponse = ({
  ok = true,
  blob = { type: 'application/pdf' },
  headers = {},
  status = 200,
} = {}) => ({
  ok,
  status,
  headers: createHeadersMock(headers),
  blob: createMockFn(async () => blob),
  clone() {
    return this;
  },
  json: createMockFn(async () => ({})),
  text: createMockFn(async () => ''),
});

const setLocalStorageMock = ({ token = '' } = {}) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      if (key === 'novogar_auth_token') {
        return token;
      }
      return null;
    },
    setItem() {},
    removeItem() {},
  };

  return () => {
    globalThis.localStorage = previous;
  };
};

const setFetchMock = (implementation) => {
  const previous = globalThis.fetch;
  const fetchMock = createMockFn(implementation);
  globalThis.fetch = fetchMock;
  return {
    fetchMock,
    restore() {
      globalThis.fetch = previous;
    },
  };
};

const setUrlApiMock = ({ createObjectURL }) => {
  const previous = globalThis.URL;
  globalThis.URL = { createObjectURL };
  return () => {
    globalThis.URL = previous;
  };
};

test('openProtectedInNewTab navega la pestana temporal al recurso cargado', async () => {
  const restoreStorage = setLocalStorageMock({ token: 'token-123' });
  const { fetchMock, restore: restoreFetch } = setFetchMock(async () => (
    createFetchResponse()
  ));
  const restoreUrlApi = setUrlApiMock({
    createObjectURL: createMockFn(() => 'blob:factura-1'),
  });
  const replace = createMockFn();
  const pendingWindow = {
    opener: { alive: true },
    location: { replace },
    close: createMockFn(),
  };
  const openWindow = createMockFn(() => pendingWindow);

  try {
    const objectUrl = await openProtectedInNewTab('/api/files/pdf?path=factura.pdf', {
      openWindow,
    });

    assert.equal(objectUrl, 'blob:factura-1');
    assert.deepEqual(openWindow.calls[0], ['', '_blank']);
    assert.equal(openWindow.calls.length, 1);
    assert.equal(fetchMock.calls.length, 1);
    assert.equal(fetchMock.calls[0][0], '/api/files/pdf?path=factura.pdf');
    assert.equal(fetchMock.calls[0][1].headers.Authorization, 'Bearer token-123');
    assert.equal(replace.calls.length, 1);
    assert.equal(replace.calls[0][0], 'blob:factura-1');
    assert.equal(pendingWindow.opener, null);
    assert.equal(pendingWindow.close.calls.length, 0);
  } finally {
    restoreStorage();
    restoreFetch();
    restoreUrlApi();
  }
});

test('openProtectedInNewTab cierra la pestana temporal y reintenta cuando no puede navegarla', async () => {
  const restoreStorage = setLocalStorageMock({ token: 'token-456' });
  const { restore: restoreFetch } = setFetchMock(async () => createFetchResponse());
  const restoreUrlApi = setUrlApiMock({
    createObjectURL: createMockFn(() => 'blob:factura-2'),
  });
  const close = createMockFn();
  const pendingWindow = {
    opener: null,
    close,
  };
  Object.defineProperty(pendingWindow, 'location', {
    value: {},
    writable: false,
    configurable: true,
  });
  const openWindow = createMockFn((url) => {
    if (!url) {
      return pendingWindow;
    }
    return null;
  });

  try {
    const objectUrl = await openProtectedInNewTab('/api/files/xml?path=factura.xml', {
      openWindow,
    });

    assert.equal(objectUrl, 'blob:factura-2');
    assert.equal(close.calls.length, 1);
    assert.deepEqual(openWindow.calls[0], ['', '_blank']);
    assert.deepEqual(openWindow.calls[1], ['blob:factura-2', '_blank', NEW_TAB_FEATURES]);
  } finally {
    restoreStorage();
    restoreFetch();
    restoreUrlApi();
  }
});

test('openProtectedInNewTab cierra la pestana temporal si la descarga falla', async () => {
  const restoreStorage = setLocalStorageMock({ token: 'token-789' });
  const { restore: restoreFetch } = setFetchMock(async () => createFetchResponse({
    ok: false,
    status: 404,
    headers: { 'content-type': 'application/json' },
  }));
  const restoreUrlApi = setUrlApiMock({
    createObjectURL: createMockFn(() => 'blob:no-usado'),
  });
  const pendingWindow = {
    opener: null,
    location: { replace: createMockFn() },
    close: createMockFn(),
  };
  const openWindow = createMockFn(() => pendingWindow);

  try {
    await assert.rejects(
      openProtectedInNewTab('/api/facturas/404/manifest', { openWindow }),
      /No se pudo abrir el recurso \(404\)/,
    );

    assert.equal(pendingWindow.close.calls.length, 1);
    assert.equal(openWindow.calls.length, 1);
  } finally {
    restoreStorage();
    restoreFetch();
    restoreUrlApi();
  }
});
