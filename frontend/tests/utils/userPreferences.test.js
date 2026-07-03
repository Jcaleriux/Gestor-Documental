import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUserPreferencesKey,
  normalizeUserPreferences,
  readUserPreferences,
  saveUserPreferences,
} from '../../src/utils/userPreferences.js';

const createStorageMock = () => {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
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

test('user preferences se guardan por usuario y normalizan tema invalido', async () => {
  const storage = createStorageMock();
  const user = { email: 'Ana.Conta@Empresa.test' };

  await withStorage(storage, async () => {
    saveUserPreferences(user, {
      profilePhotoDataUrl: 'data:image/png;base64,abc',
      themeMode: 'dark',
    });

    assert.equal(
      buildUserPreferencesKey(user),
      'sendadocs.user.preferences.v1.ana.conta%40empresa.test',
    );
    assert.deepEqual(readUserPreferences(user), {
      profilePhotoDataUrl: 'data:image/png;base64,abc',
      themeMode: 'dark',
    });

    assert.deepEqual(normalizeUserPreferences({ themeMode: 'sepia' }), {
      profilePhotoDataUrl: '',
      themeMode: 'light',
    });
  });
});

test('user preferences toleran storage bloqueado', async () => {
  const blockedStorage = {
    getItem() {
      throw new Error('Storage bloqueado');
    },
    setItem() {
      throw new Error('Storage bloqueado');
    },
  };

  await withStorage(blockedStorage, async () => {
    assert.doesNotThrow(() => saveUserPreferences({ id: 1 }, { themeMode: 'dark' }));
    assert.deepEqual(readUserPreferences({ id: 1 }), {
      profilePhotoDataUrl: '',
      themeMode: 'light',
    });
  });
});
