import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturaRowActions } from '../../src/hooks/facturas/useFacturaRowActions.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useFacturaRowActionsHarness = (props) => useFacturaRowActions(props);

const createEventTargetMock = () => {
  const listeners = new Map();

  return {
    listeners,
    addEventListener: createMockFn((eventName, handler) => {
      listeners.set(eventName, handler);
    }),
    removeEventListener: createMockFn((eventName) => {
      listeners.delete(eventName);
    }),
  };
};

test('useFacturaRowActions abre Mensaje Hacienda autenticado cuando existe XML', async () => {
  const buildAuthUrl = createMockFn((url) => `auth:${url}`);
  const openWindow = createMockFn();
  const getMensajeHacienda = createMockFn(async () => ({
    data: {
      data: {
        ruta_xml: 'mensajes/mh-7.xml',
      },
    },
  }));

  const hook = createHookHarness({
    hook: useFacturaRowActionsHarness,
    initialProps: {
      items: [{ id: 7 }],
      resetKey: '10:vencidas',
      dependencies: {
        api: { getMensajeHacienda },
        buildAuthUrl,
        openWindow,
        eventTarget: null,
      },
    },
  });

  await hook.result.viewMensajeHacienda({ id: 7, has_mensaje_hacienda: true });
  await hook.flush({ cycles: 4 });

  assert.equal(getMensajeHacienda.calls.length, 1);
  assert.equal(buildAuthUrl.calls[0][0], '/api/files/xml?path=mensajes%2Fmh-7.xml');
  assert.deepEqual(openWindow.calls[0], [
    'auth:/api/files/xml?path=mensajes%2Fmh-7.xml',
    '_blank',
    'noopener,noreferrer',
  ]);
  assert.equal(hook.result.actionError, '');
  assert.equal(hook.result.mhLoadingId, null);
});

test('useFacturaRowActions expone error claro cuando Mensaje Hacienda no trae XML', async () => {
  const hook = createHookHarness({
    hook: useFacturaRowActionsHarness,
    initialProps: {
      items: [{ id: 9 }],
      resetKey: '10:all',
      dependencies: {
        api: {
          getMensajeHacienda: createMockFn(async () => ({ data: { data: {} } })),
        },
        buildAuthUrl: createMockFn((url) => url),
        openWindow: createMockFn(),
        eventTarget: null,
      },
    },
  });

  await hook.result.viewMensajeHacienda({ id: 9, has_mensaje_hacienda: true });
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.actionError, 'Mensaje Hacienda sin XML.');
});

test('useFacturaRowActions cierra el menu al hacer click fuera y al cambiar items', async () => {
  const eventTarget = createEventTargetMock();

  const hook = createHookHarness({
    hook: useFacturaRowActionsHarness,
    initialProps: {
      items: [{ id: 1 }],
      resetKey: '10:base',
      dependencies: {
        api: {
          getMensajeHacienda: createMockFn(async () => ({ data: { data: {} } })),
        },
        buildAuthUrl: createMockFn((url) => url),
        openWindow: createMockFn(),
        eventTarget,
      },
    },
  });

  hook.result.toggleMenu(1);
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.openMenuId, 1);
  assert.equal(eventTarget.addEventListener.calls.length, 2);

  eventTarget.listeners.get('mousedown')({
    target: {
      closest: () => null,
    },
  });
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.openMenuId, null);

  hook.result.toggleMenu(1);
  await hook.flush({ cycles: 4 });
  hook.rerender({
    items: [{ id: 2 }],
    resetKey: '10:base',
    dependencies: {
      api: {
        getMensajeHacienda: createMockFn(async () => ({ data: { data: {} } })),
      },
      buildAuthUrl: createMockFn((url) => url),
      openWindow: createMockFn(),
      eventTarget,
    },
  });
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.openMenuId, null);
});

test('useFacturaRowActions limpia estado derivado cuando cambia resetKey', async () => {
  const hook = createHookHarness({
    hook: useFacturaRowActionsHarness,
    initialProps: {
      items: [{ id: 4 }],
      resetKey: '10:base',
      dependencies: {
        api: {
          getMensajeHacienda: createMockFn(async () => ({ data: { data: {} } })),
        },
        buildAuthUrl: createMockFn((url) => url),
        openWindow: createMockFn(),
        eventTarget: null,
      },
    },
  });

  hook.result.toggleMenu(4);
  hook.result.setActionError('fallo temporal');
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.openMenuId, 4);
  assert.equal(hook.result.actionError, 'fallo temporal');

  hook.rerender({
    items: [{ id: 4 }],
    resetKey: '10:otro',
    dependencies: {
      api: {
        getMensajeHacienda: createMockFn(async () => ({ data: { data: {} } })),
      },
      buildAuthUrl: createMockFn((url) => url),
      openWindow: createMockFn(),
      eventTarget: null,
    },
  });
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.openMenuId, null);
  assert.equal(hook.result.actionError, '');
  assert.equal(hook.result.mhLoadingId, null);
});
