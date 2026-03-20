import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  saveAuthSession,
  withAuthToken,
} from '../../src/utils/auth.js';

const createBlockedStorage = () => ({
  getItem() {
    throw new Error('Storage bloqueado');
  },
  setItem() {
    throw new Error('Storage bloqueado');
  },
  removeItem() {
    throw new Error('Storage bloqueado');
  },
});

const withBlockedStorage = async (run) => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const blockedStorage = createBlockedStorage();

  globalThis.window = {
    localStorage: blockedStorage,
  };
  globalThis.localStorage = blockedStorage;

  try {
    await run();
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }

    if (previousLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = previousLocalStorage;
    }
  }
};

test('auth utils toleran storage bloqueado sin lanzar errores', async () => {
  await withBlockedStorage(async () => {
    assert.equal(getAuthToken(), '');
    assert.equal(getAuthUser(), null);
    assert.doesNotThrow(() => saveAuthSession({ token: 'token-1', user: { id: 1 } }));
    assert.doesNotThrow(() => clearAuthSession());
    assert.equal(withAuthToken('/api/facturas'), '/api/facturas');
  });
});
