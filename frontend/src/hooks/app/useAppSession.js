import { useCallback, useEffect, useMemo, useReducer } from 'react';
import axios from 'axios';
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  saveAuthSession,
} from '../../utils/auth.js';

const SELECTED_SOCIEDAD_KEY = 'sendadocs.sociedad.selected';
const DEFAULT_AUTH_SESSION = Object.freeze({
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  saveAuthSession,
});

const readWindowStorageItem = (key) => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const setAxiosAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
};

const initialsFromName = (name) => {
  if (!name) return 'US';
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || '')
    .join('') || 'US';
};

const readSociedadFromLocation = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return new URLSearchParams(window.location.search).get('sociedad') || '';
  } catch {
    return '';
  }
};

const readSelectedSociedadPreference = () => {
  return readWindowStorageItem(SELECTED_SOCIEDAD_KEY);
};

const getInitialSociedadId = () => readSociedadFromLocation() || readSelectedSociedadPreference();

const persistSelectedSociedad = (sociedadId) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (sociedadId) {
      window.localStorage.setItem(SELECTED_SOCIEDAD_KEY, sociedadId);
      return;
    }

    window.localStorage.removeItem(SELECTED_SOCIEDAD_KEY);
  } catch {
    // Ignore storage failures so the login screen can still render.
  }
};

const redirectToLoginPage = () => {
  if (typeof window === 'undefined' || !window.location) {
    return;
  }

  if (window.location.pathname === '/login') {
    return;
  }

  if (typeof window.location.assign === 'function') {
    window.location.assign('/login');
  }
};

const createInitialState = (initialSociedadId) => ({
  sociedades: [],
  sociedadId: initialSociedadId || '',
  authToken: '',
  authUser: null,
  authLoading: true,
});

const appReducer = (state, action) => {
  switch (action.type) {
    case 'applySession':
      return {
        ...state,
        authToken: action.token || '',
        authUser: action.user || null,
      };
    case 'clearSession':
      return {
        ...state,
        sociedades: [],
        sociedadId: '',
        authToken: '',
        authUser: null,
      };
    case 'setAuthLoading':
      return {
        ...state,
        authLoading: Boolean(action.value),
      };
    case 'setSociedades': {
      const nextSociedades = Array.isArray(action.value) ? action.value : [];
      const hasSelectedSociedad = nextSociedades.some(
        (sociedad) => String(sociedad.id) === String(state.sociedadId),
      );

      return {
        ...state,
        sociedades: nextSociedades,
        sociedadId: hasSelectedSociedad ? state.sociedadId : '',
      };
    }
    case 'setSociedadId':
      return {
        ...state,
        sociedadId: action.value || '',
      };
    default:
      return state;
  }
};

const deriveUserAccess = (authUser) => {
  const userPermissions = Array.isArray(authUser?.permissions) ? authUser.permissions : [];
  const canManageUsers = userPermissions.includes('acceso_total')
    || userPermissions.includes('usuarios_administrar');
  const canManageSociedades = userPermissions.includes('acceso_total')
    || userPermissions.includes('sociedades_administrar');
  const canUseTablasPago = userPermissions.includes('acceso_total')
    || userPermissions.includes('usuarios_administrar')
    || userPermissions.includes('documentos_subir')
    || userPermissions.includes('documentos_contabilizar');
  const canViewTramites = userPermissions.includes('acceso_total')
    || userPermissions.includes('documentos_ver')
    || userPermissions.includes('documentos_tramitar_pago')
    || userPermissions.includes('documentos_aprobar_gerencia')
    || userPermissions.includes('documentos_aprobar_gerencia_contable')
    || userPermissions.includes('documentos_aprobar_gerencia_financiera')
    || userPermissions.includes('documentos_marcar_pagado');
  const canTramitarPago = userPermissions.includes('acceso_total')
    || userPermissions.includes('documentos_tramitar_pago');
  const canEditContabilizacion = userPermissions.includes('acceso_total')
    || userPermissions.includes('documentos_contabilizar');
  const canUseReservas = userPermissions.includes('acceso_total')
    || userPermissions.includes('reservas_ver')
    || userPermissions.includes('reservas_crear')
    || userPermissions.includes('reservas_gestionar');
  const canManageReservasDocumentos = userPermissions.includes('acceso_total')
    || userPermissions.includes('reservas_gestionar');

  return {
    userPermissions,
    canManageUsers,
    canManageSociedades,
    canUseTablasPago,
    canUseOrdenesCompra: canUseTablasPago,
    canViewTramites,
    canTramitarPago,
    canEditContabilizacion,
    canUseReservas,
    canManageReservasDocumentos,
  };
};

export const useAppSession = ({
  dependencies = {},
} = {}) => {
  const {
    api = axios,
    authSession = DEFAULT_AUTH_SESSION,
    getInitialSociedad = getInitialSociedadId,
    persistSociedad = persistSelectedSociedad,
    redirectToLogin = redirectToLoginPage,
    setAuthHeader = setAxiosAuthHeader,
  } = dependencies;

  const [{
    sociedades,
    sociedadId,
    authToken,
    authUser,
    authLoading,
  }, dispatch] = useReducer(appReducer, getInitialSociedad(), createInitialState);

  const clearSession = useCallback(() => {
    authSession.clearAuthSession();
    dispatch({ type: 'clearSession' });
    setAuthHeader('');
  }, [authSession, setAuthHeader]);

  const applySession = useCallback(({ token, user }) => {
    authSession.saveAuthSession({ token, user });
    dispatch({ type: 'applySession', token, user });
    setAuthHeader(token || '');
  }, [authSession, setAuthHeader]);

  const bootstrapAuth = useCallback(async () => {
    const token = authSession.getAuthToken();
    const storedUser = authSession.getAuthUser();

    if (!token) {
      dispatch({ type: 'setAuthLoading', value: false });
      return;
    }

    setAuthHeader(token);

    try {
      const response = await api.get('/api/auth/me');
      const meUser = response.data?.data?.user || storedUser;
      applySession({ token, user: meUser || null });
    } catch {
      clearSession();
    } finally {
      dispatch({ type: 'setAuthLoading', value: false });
    }
  }, [api, applySession, authSession, clearSession, setAuthHeader]);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  const isAuthenticated = Boolean(authToken);

  const fetchSociedades = useCallback(async () => {
    try {
      const response = await api.get('/api/sociedades');
      if (response.data?.success) {
        dispatch({ type: 'setSociedades', value: response.data.data || [] });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        clearSession();
      }
      console.error(error);
    }
  }, [api, clearSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchSociedades();
  }, [fetchSociedades, isAuthenticated]);

  useEffect(() => {
    persistSociedad(sociedadId);
  }, [persistSociedad, sociedadId]);

  const setSociedadId = useCallback((value) => {
    dispatch({ type: 'setSociedadId', value });
  }, []);

  const handleLoginSuccess = useCallback(({ token, user }) => {
    applySession({ token, user });
  }, [applySession]);

  const handleLogout = useCallback(() => {
    clearSession();
    redirectToLogin();
  }, [clearSession, redirectToLogin]);

  const selectedSociedad = useMemo(
    () => sociedades.find((sociedad) => String(sociedad.id) === String(sociedadId)),
    [sociedadId, sociedades],
  );

  const access = useMemo(() => deriveUserAccess(authUser), [authUser]);
  const userName = authUser?.nombre || 'Usuario';
  const userRole = authUser?.rol_nombre || authUser?.rol_codigo || (authUser?.rol != null ? `Rol ${authUser.rol}` : 'Usuario');
  const userInitials = useMemo(() => initialsFromName(userName), [userName]);

  return {
    authLoading,
    authToken,
    authUser,
    handleLoginSuccess,
    handleLogout,
    isAuthenticated,
    selectedSociedad,
    setSociedadId,
    sociedadId,
    sociedades,
    refreshSociedades: fetchSociedades,
    userInitials,
    userName,
    userRole,
    ...access,
  };
};
