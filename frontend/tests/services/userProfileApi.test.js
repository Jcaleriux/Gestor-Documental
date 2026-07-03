import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import {
  deleteUserAvatar,
  fetchUserAvatarObjectUrl,
  getUserProfile,
  updateUserPreferences,
  uploadUserAvatar,
} from '../../src/services/userProfileApi.js';
import { AUTH_TOKEN_KEY } from '../../src/utils/auth.js';
import { createMockFn } from '../utils/mockFn.js';

const withAxiosMock = async (methods, run) => {
  const previous = {};

  for (const [method, implementation] of Object.entries(methods)) {
    previous[method] = axios[method];
    axios[method] = createMockFn(implementation);
  }

  try {
    await run();
  } finally {
    for (const method of Object.keys(methods)) {
      axios[method] = previous[method];
    }
  }
};

const setLocalStorageMock = ({ token = '' } = {}) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      if (key === AUTH_TOKEN_KEY) {
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

const createHeadersMock = (entries = {}) => ({
  get(name) {
    return entries[name.toLowerCase()] || entries[name] || '';
  },
});

test('userProfileApi usa contrato /api/me/preferencias y /api/me/avatar', async () => {
  await withAxiosMock({
    get: async () => ({ data: { data: { preferencias: { theme_mode: 'dark' } } } }),
    patch: async () => ({ data: { data: { preferencias: { theme_mode: 'light' } } } }),
    put: async () => ({ data: { data: { avatar: { has_avatar: true } } } }),
    delete: async () => ({ data: { data: { avatar: { has_avatar: false } } } }),
  }, async () => {
    assert.deepEqual(await getUserProfile(), { preferencias: { theme_mode: 'dark' } });
    assert.deepEqual(await updateUserPreferences({ themeMode: 'light' }), {
      preferencias: { theme_mode: 'light' },
    });
    assert.deepEqual(await uploadUserAvatar({
      fileBase64: 'data:image/png;base64,abc=',
      filename: 'perfil.png',
      mimeType: 'image/png',
    }), {
      avatar: { has_avatar: true },
    });
    assert.deepEqual(await deleteUserAvatar(), {
      avatar: { has_avatar: false },
    });

    assert.deepEqual(axios.get.calls[0], ['/api/me/preferencias']);
    assert.deepEqual(axios.patch.calls[0], ['/api/me/preferencias', { theme_mode: 'light' }]);
    assert.deepEqual(axios.put.calls[0], ['/api/me/avatar', {
      filename: 'perfil.png',
      file_base64: 'data:image/png;base64,abc=',
      mime_type: 'image/png',
    }]);
    assert.deepEqual(axios.delete.calls[0], ['/api/me/avatar']);
  });
});

test('fetchUserAvatarObjectUrl descarga avatar protegido con token', async () => {
  const restoreStorage = setLocalStorageMock({ token: 'token-avatar' });
  const previousFetch = globalThis.fetch;
  const previousUrl = globalThis.URL;
  const blob = { type: 'image/png' };
  globalThis.fetch = createMockFn(async () => ({
    ok: true,
    status: 200,
    headers: createHeadersMock(),
    blob: createMockFn(async () => blob),
    clone() {
      return this;
    },
    json: createMockFn(async () => ({})),
    text: createMockFn(async () => ''),
  }));
  globalThis.URL = {
    createObjectURL: createMockFn(() => 'blob:avatar'),
  };

  try {
    const objectUrl = await fetchUserAvatarObjectUrl();

    assert.equal(objectUrl, 'blob:avatar');
    assert.equal(globalThis.fetch.calls[0][0], '/api/me/avatar');
    assert.equal(globalThis.fetch.calls[0][1].headers.Authorization, 'Bearer token-avatar');
    assert.deepEqual(globalThis.URL.createObjectURL.calls[0], [blob]);
  } finally {
    restoreStorage();
    globalThis.fetch = previousFetch;
    globalThis.URL = previousUrl;
  }
});
