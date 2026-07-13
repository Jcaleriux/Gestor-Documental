import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildThemeDiscoveryTipKey,
  buildThemeDiscoveryTipKeys,
  markThemeDiscoveryTipDismissed,
  shouldShowThemeDiscoveryTip,
} from '../../src/utils/themeDiscoveryTip.js';

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

test('theme discovery tip se muestra una sola vez por usuario', async () => {
  const storage = createStorageMock();
  const user = { email: 'Ana.Conta@Empresa.test' };

  await withStorage(storage, async () => {
    assert.equal(
      buildThemeDiscoveryTipKey(user),
      'sendadocs.theme.discoveryTip.v1.ana.conta%40empresa.test',
    );
    assert.equal(shouldShowThemeDiscoveryTip(user), true);

    markThemeDiscoveryTipDismissed(user);

    assert.equal(shouldShowThemeDiscoveryTip(user), false);
    assert.equal(shouldShowThemeDiscoveryTip({ email: 'otro@empresa.test' }), true);
  });
});

test('theme discovery tip reconoce id, email y usuario como el mismo dismissal', async () => {
  const storage = createStorageMock();
  const user = {
    id: 7,
    email: 'Ana.Conta@Empresa.test',
    usuario: 'ana.conta',
  };

  await withStorage(storage, async () => {
    assert.deepEqual(buildThemeDiscoveryTipKeys(user), [
      'sendadocs.theme.discoveryTip.v1.7',
      'sendadocs.theme.discoveryTip.v1.ana.conta%40empresa.test',
      'sendadocs.theme.discoveryTip.v1.ana.conta',
    ]);

    markThemeDiscoveryTipDismissed(user);

    assert.equal(shouldShowThemeDiscoveryTip({ id: 7 }), false);
    assert.equal(shouldShowThemeDiscoveryTip({ email: 'ana.conta@empresa.test' }), false);
    assert.equal(shouldShowThemeDiscoveryTip({ usuario: 'ana.conta' }), false);
    assert.equal(shouldShowThemeDiscoveryTip({ email: 'otro@empresa.test' }), true);
  });
});

test('theme discovery tip no reaparece si existe una llave legacy por email', async () => {
  const storage = createStorageMock();

  await withStorage(storage, async () => {
    storage.setItem(
      'sendadocs.theme.discoveryTip.v1.ana.conta%40empresa.test',
      'dismissed',
    );

    assert.equal(shouldShowThemeDiscoveryTip({
      id: 7,
      email: 'Ana.Conta@Empresa.test',
    }), false);
  });
});

test('theme discovery tip tolera storage bloqueado', async () => {
  const blockedStorage = {
    getItem() {
      throw new Error('Storage bloqueado');
    },
    setItem() {
      throw new Error('Storage bloqueado');
    },
  };

  await withStorage(blockedStorage, async () => {
    assert.equal(shouldShowThemeDiscoveryTip({ id: 1 }), false);
    assert.doesNotThrow(() => markThemeDiscoveryTipDismissed({ id: 1 }));
  });
});
