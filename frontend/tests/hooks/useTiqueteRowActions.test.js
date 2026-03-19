import test from 'node:test';
import assert from 'node:assert/strict';
import { useTiqueteRowActions } from '../../src/hooks/tiquetes/useTiqueteRowActions.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useTiqueteRowActionsHarness = (props) => useTiqueteRowActions(props);

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

test('useTiqueteRowActions cierra el menu al hacer click fuera', async () => {
  const eventTarget = createEventTargetMock();
  const hook = createHookHarness({
    hook: useTiqueteRowActionsHarness,
    initialProps: {
      items: [{ id: 1 }],
      resetKey: '10',
      dependencies: { eventTarget },
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
});

test('useTiqueteRowActions cierra el menu al cambiar items o resetKey', async () => {
  const hook = createHookHarness({
    hook: useTiqueteRowActionsHarness,
    initialProps: {
      items: [{ id: 1 }],
      resetKey: '10',
      dependencies: { eventTarget: null },
    },
  });

  hook.result.toggleMenu(1);
  await hook.flush({ cycles: 4 });
  assert.equal(hook.result.openMenuId, 1);

  hook.rerender({
    items: [{ id: 2 }],
    resetKey: '10',
    dependencies: { eventTarget: null },
  });
  await hook.flush({ cycles: 4 });
  assert.equal(hook.result.openMenuId, null);

  hook.result.toggleMenu(2);
  await hook.flush({ cycles: 4 });
  hook.rerender({
    items: [{ id: 2 }],
    resetKey: '11',
    dependencies: { eventTarget: null },
  });
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.openMenuId, null);
});
