import test from 'node:test';
import assert from 'node:assert/strict';
import { useOnboardingStatus } from '../../src/hooks/app/useOnboardingStatus.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useOnboardingStatusHarness = (props) => useOnboardingStatus(props);

test('useOnboardingStatus no consulta la API cuando esta deshabilitado', async () => {
  const getOnboardingStatus = createMockFn(async () => {
    throw new Error('No deberia consultar onboarding');
  });

  const hook = createHookHarness({
    hook: useOnboardingStatusHarness,
    initialProps: {
      enabled: false,
      dependencies: {
        api: { getOnboardingStatus },
      },
    },
  });

  await hook.flush({ cycles: 3 });

  assert.equal(getOnboardingStatus.calls.length, 0);
  assert.equal(hook.result.checked, false);
  assert.equal(hook.result.requiresSetup, false);
});

test('useOnboardingStatus carga estado de setup inicial', async () => {
  const getOnboardingStatus = createMockFn(async () => ({
    data: {
      success: true,
      data: {
        requiresSetup: true,
        setupAllowed: true,
      },
    },
  }));

  const hook = createHookHarness({
    hook: useOnboardingStatusHarness,
    initialProps: {
      enabled: true,
      dependencies: {
        api: { getOnboardingStatus },
      },
    },
  });

  await hook.flush({ cycles: 5 });

  assert.equal(getOnboardingStatus.calls.length, 1);
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.checked, true);
  assert.equal(hook.result.error, '');
  assert.equal(hook.result.requiresSetup, true);
  assert.equal(hook.result.setupAllowed, true);
});

test('useOnboardingStatus expone error de validacion inicial', async () => {
  const getOnboardingStatus = createMockFn(async () => {
    const error = new Error('fallo');
    error.response = {
      data: {
        error: 'No disponible',
      },
    };
    throw error;
  });

  const hook = createHookHarness({
    hook: useOnboardingStatusHarness,
    initialProps: {
      enabled: true,
      dependencies: {
        api: { getOnboardingStatus },
      },
    },
  });

  await hook.flush({ cycles: 5 });

  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.checked, true);
  assert.equal(hook.result.error, 'No disponible');
  assert.equal(hook.result.requiresSetup, false);
});
