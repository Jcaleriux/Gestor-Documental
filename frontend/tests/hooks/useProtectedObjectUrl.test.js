import test from 'node:test';
import assert from 'node:assert/strict';
import { useProtectedObjectUrl } from '../../src/hooks/useProtectedObjectUrl.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useProtectedObjectUrlHarness = (props) => useProtectedObjectUrl(
  props.resourceUrl,
  props.dependencies,
);

test('useProtectedObjectUrl retorna estado idle cuando falta resourceUrl', async () => {
  const fetchResource = createMockFn(async () => ({
    blob: { size: 10 },
  }));

  const hook = createHookHarness({
    hook: useProtectedObjectUrlHarness,
    initialProps: {
      resourceUrl: '',
      dependencies: {
        fetchResource,
        getUrlApiImpl: () => ({
          createObjectURL: () => 'blob:demo',
          revokeObjectURL: () => {},
        }),
      },
    },
  });

  await hook.flush({ cycles: 3 });

  assert.equal(fetchResource.calls.length, 0);
  assert.deepEqual(hook.result, {
    resourceUrl: '',
    objectUrl: '',
    error: '',
    loading: false,
  });
});

test('useProtectedObjectUrl expone error estable cuando URL API no soporta createObjectURL', async () => {
  const fetchResource = createMockFn(async () => ({
    blob: { size: 10 },
  }));

  const hook = createHookHarness({
    hook: useProtectedObjectUrlHarness,
    initialProps: {
      resourceUrl: '/api/files/pdf?path=demo',
      dependencies: {
        fetchResource,
        getUrlApiImpl: () => ({}),
      },
    },
  });

  await hook.flush({ cycles: 3 });

  assert.equal(fetchResource.calls.length, 0);
  assert.deepEqual(hook.result, {
    resourceUrl: '/api/files/pdf?path=demo',
    objectUrl: '',
    error: 'No se pudo crear la vista previa del recurso.',
    loading: false,
  });
});

test('useProtectedObjectUrl carga blob protegido y expone objectUrl', async () => {
  const fetchResource = createMockFn(async () => ({
    blob: { size: 10, type: 'application/pdf' },
  }));
  const createObjectURL = createMockFn(() => 'blob:ok');
  const revokeObjectURL = createMockFn();

  const hook = createHookHarness({
    hook: useProtectedObjectUrlHarness,
    initialProps: {
      resourceUrl: '/api/files/pdf?path=demo',
      dependencies: {
        fetchResource,
        getUrlApiImpl: () => ({
          createObjectURL,
          revokeObjectURL,
        }),
      },
    },
  });

  assert.equal(hook.result.loading, true);
  await hook.flush({ cycles: 6 });

  assert.equal(fetchResource.calls.length, 1);
  assert.equal(createObjectURL.calls.length, 1);
  assert.deepEqual(hook.result, {
    resourceUrl: '/api/files/pdf?path=demo',
    objectUrl: 'blob:ok',
    error: '',
    loading: false,
  });

  hook.unmount();
  assert.equal(revokeObjectURL.calls.length, 1);
});

test('useProtectedObjectUrl oculta el objectUrl anterior cuando cambia resourceUrl sin reset en effect', async () => {
  const fetchResource = createMockFn(async (url) => ({
    blob: { url },
  }));
  const createObjectURL = createMockFn((blob) => `blob:${blob.url}`);

  const hook = createHookHarness({
    hook: useProtectedObjectUrlHarness,
    initialProps: {
      resourceUrl: '/api/files/pdf?path=uno',
      dependencies: {
        fetchResource,
        getUrlApiImpl: () => ({
          createObjectURL,
          revokeObjectURL: () => {},
        }),
      },
    },
  });

  await hook.flush({ cycles: 6 });
  assert.equal(hook.result.objectUrl, 'blob:/api/files/pdf?path=uno');

  hook.rerender({
    resourceUrl: '/api/files/pdf?path=dos',
    dependencies: {
      fetchResource,
      getUrlApiImpl: () => ({
        createObjectURL,
        revokeObjectURL: () => {},
      }),
    },
  });

  assert.deepEqual(hook.result, {
    resourceUrl: '/api/files/pdf?path=dos',
    objectUrl: '',
    error: '',
    loading: true,
  });

  await hook.flush({ cycles: 6 });
  assert.equal(hook.result.objectUrl, 'blob:/api/files/pdf?path=dos');
});
