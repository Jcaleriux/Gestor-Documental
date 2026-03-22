import test from 'node:test';
import assert from 'node:assert/strict';
import { useAppSession } from '../../src/hooks/app/useAppSession.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useAppSessionHarness = (props) => useAppSession(props);
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

const withBlockedWindowStorage = async (run) => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const blockedStorage = createBlockedStorage();

  globalThis.window = {
    location: { search: '' },
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

test('useAppSession termina sin autenticar cuando no hay token guardado', async () => {
  const apiGet = createMockFn(async () => {
    throw new Error('No deberia consultar la API sin token');
  });
  const setAuthHeader = createMockFn();

  const hook = createHookHarness({
    hook: useAppSessionHarness,
    initialProps: {
      dependencies: {
        api: { get: apiGet },
        authSession: {
          clearAuthSession: createMockFn(),
          getAuthToken: createMockFn(() => ''),
          getAuthUser: createMockFn(() => null),
          saveAuthSession: createMockFn(),
        },
        getInitialSociedad: createMockFn(() => ''),
        persistSociedad: createMockFn(),
        setAuthHeader,
      },
    },
  });

  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.authLoading, false);
  assert.equal(hook.result.isAuthenticated, false);
  assert.equal(hook.result.authToken, '');
  assert.equal(apiGet.calls.length, 0);
  assert.equal(setAuthHeader.calls.length, 0);
});

test('useAppSession bootstrappea sesion, sociedades y permisos derivados', async () => {
  const saveAuthSession = createMockFn();
  const setAuthHeader = createMockFn();
  const authUser = {
    id: 7,
    nombre: 'Ana Ramirez',
    rol_nombre: 'Tesoreria',
    permissions: ['documentos_tramitar_pago', 'reservas_gestionar'],
  };
  const apiGet = createMockFn(async (url) => {
    if (url === '/api/auth/me') {
      return {
        data: {
          data: {
            user: authUser,
          },
        },
      };
    }

    if (url === '/api/sociedades') {
      return {
        data: {
          success: true,
          data: [
            { id: 10, nombre_proyecto: 'EDE', razon_social: 'EDE SA', cedula_juridica: '3-101-111111' },
            { id: 20, nombre_proyecto: 'NOVO', razon_social: 'Novogar SA', cedula_juridica: '3-101-222222' },
          ],
        },
      };
    }

    throw new Error(`Ruta inesperada: ${url}`);
  });

  const hook = createHookHarness({
    hook: useAppSessionHarness,
    initialProps: {
      dependencies: {
        api: { get: apiGet },
        authSession: {
          clearAuthSession: createMockFn(),
          getAuthToken: createMockFn(() => 'token-123'),
          getAuthUser: createMockFn(() => ({ nombre: 'Stored User' })),
          saveAuthSession,
        },
        getInitialSociedad: createMockFn(() => '10'),
        persistSociedad: createMockFn(),
        setAuthHeader,
      },
    },
  });

  await hook.flush({ cycles: 8 });

  assert.equal(hook.result.authLoading, false);
  assert.equal(hook.result.isAuthenticated, true);
  assert.equal(hook.result.userName, 'Ana Ramirez');
  assert.equal(hook.result.userInitials, 'AR');
  assert.equal(hook.result.canTramitarPago, true);
  assert.equal(hook.result.canUseReservas, true);
  assert.equal(hook.result.canManageReservasDocumentos, true);
  assert.equal(hook.result.canManageUsers, false);
  assert.equal(hook.result.sociedades.length, 2);
  assert.equal(hook.result.selectedSociedad?.id, 10);
  assert.deepEqual(apiGet.calls.map(([url]) => url), ['/api/auth/me', '/api/sociedades']);
  assert.equal(saveAuthSession.calls.length, 1);
  assert.deepEqual(setAuthHeader.calls.map(([token]) => token), ['token-123', 'token-123']);
});

test('useAppSession persiste cambios de sociedad seleccionada', async () => {
  const persistSociedad = createMockFn();

  const hook = createHookHarness({
    hook: useAppSessionHarness,
    initialProps: {
      dependencies: {
        api: { get: createMockFn(async () => ({ data: { success: true, data: [] } })) },
        authSession: {
          clearAuthSession: createMockFn(),
          getAuthToken: createMockFn(() => ''),
          getAuthUser: createMockFn(() => null),
          saveAuthSession: createMockFn(),
        },
        getInitialSociedad: createMockFn(() => ''),
        persistSociedad,
        setAuthHeader: createMockFn(),
      },
    },
  });

  await hook.flush({ cycles: 4 });

  hook.result.setSociedadId('10');
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.sociedadId, '10');
  assert.deepEqual(persistSociedad.calls.at(-1), ['10']);
});

test('useAppSession arranca aunque window.localStorage no sea accesible', async () => {
  await withBlockedWindowStorage(async () => {
    const apiGet = createMockFn(async () => {
      throw new Error('No deberia consultar la API sin token');
    });
    const setAuthHeader = createMockFn();

    const hook = createHookHarness({
      hook: useAppSessionHarness,
      initialProps: {
        dependencies: {
          api: { get: apiGet },
          setAuthHeader,
        },
      },
    });

    await hook.flush({ cycles: 4 });

    assert.equal(hook.result.authLoading, false);
    assert.equal(hook.result.isAuthenticated, false);
    assert.equal(hook.result.sociedadId, '');
    assert.equal(apiGet.calls.length, 0);
    assert.equal(setAuthHeader.calls.length, 0);
  });
});

test('useAppSession handleLogout limpia la sesion y redirige a login', async () => {
  const clearAuthSession = createMockFn();
  const redirectToLogin = createMockFn();
  const setAuthHeader = createMockFn();
  const apiGet = createMockFn(async (url) => {
    if (url === '/api/auth/me') {
      return {
        data: {
          data: {
            user: {
              id: 9,
              nombre: 'Gerencia Test',
              permissions: ['documentos_aprobar_gerencia'],
            },
          },
        },
      };
    }

    if (url === '/api/sociedades') {
      return {
        data: {
          success: true,
          data: [
            { id: 15, nombre_proyecto: 'Arbora', razon_social: 'Arbora SA', cedula_juridica: '3-101-861274' },
          ],
        },
      };
    }

    throw new Error(`Ruta inesperada: ${url}`);
  });

  const hook = createHookHarness({
    hook: useAppSessionHarness,
    initialProps: {
      dependencies: {
        api: { get: apiGet },
        authSession: {
          clearAuthSession,
          getAuthToken: createMockFn(() => 'token-logout'),
          getAuthUser: createMockFn(() => ({ nombre: 'Stored Gerencia' })),
          saveAuthSession: createMockFn(),
        },
        getInitialSociedad: createMockFn(() => '15'),
        persistSociedad: createMockFn(),
        redirectToLogin,
        setAuthHeader,
      },
    },
  });

  await hook.flush({ cycles: 8 });

  assert.equal(hook.result.isAuthenticated, true);
  assert.equal(hook.result.sociedadId, '15');

  hook.result.handleLogout();
  await hook.flush({ cycles: 4 });

  assert.equal(clearAuthSession.calls.length, 1);
  assert.equal(redirectToLogin.calls.length, 1);
  assert.equal(hook.result.isAuthenticated, false);
  assert.equal(hook.result.authToken, '');
  assert.equal(hook.result.authUser, null);
  assert.equal(hook.result.sociedadId, '');
  assert.equal(hook.result.sociedades.length, 0);
  assert.deepEqual(setAuthHeader.calls.at(-1), ['']);
});
