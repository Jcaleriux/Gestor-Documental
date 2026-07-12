import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFirstSociedadTipKey,
  markFirstSociedadTipDismissed,
  shouldShowFirstSociedadTip,
} from '../../src/utils/firstSociedadTip.js';

const createStorageMock = () => {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
};

const withStorage = async (storage, run) => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;

  globalThis.window = { localStorage: storage };
  globalThis.localStorage = storage;

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

test('first sociedad tip se muestra hasta que el usuario lo cierra', async () => {
  const storage = createStorageMock();
  const user = { email: 'Admin@Empresa.test' };

  await withStorage(storage, async () => {
    assert.equal(
      buildFirstSociedadTipKey(user),
      'sendadocs.firstSociedadTip.v1.admin%40empresa.test',
    );
    assert.equal(shouldShowFirstSociedadTip(user), true);

    markFirstSociedadTipDismissed(user);

    assert.equal(shouldShowFirstSociedadTip(user), false);
    assert.equal(shouldShowFirstSociedadTip({ email: 'otro@empresa.test' }), true);
  });
});

test('first sociedad tip tolera storage bloqueado', async () => {
  const blockedStorage = {
    getItem() {
      throw new Error('Storage bloqueado');
    },
    setItem() {
      throw new Error('Storage bloqueado');
    },
  };

  await withStorage(blockedStorage, async () => {
    assert.equal(shouldShowFirstSociedadTip({ id: 1 }), false);
    assert.doesNotThrow(() => markFirstSociedadTipDismissed({ id: 1 }));
  });
});
