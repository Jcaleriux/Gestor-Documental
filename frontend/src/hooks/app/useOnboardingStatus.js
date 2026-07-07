import { useCallback, useEffect, useState } from 'react';
import * as onboardingApi from '../../services/onboardingApi.js';

const INITIAL_STATUS = Object.freeze({
  loading: false,
  checked: false,
  error: '',
  requiresSetup: false,
  setupAllowed: false,
});

const normalizeStatus = (response) => {
  const data = response?.data?.data || {};
  return {
    requiresSetup: data.requiresSetup === true,
    setupAllowed: data.setupAllowed === true,
  };
};

const useOnboardingStatus = ({
  enabled = true,
  dependencies = {},
} = {}) => {
  const {
    api = onboardingApi,
  } = dependencies;
  const [state, setState] = useState(INITIAL_STATUS);

  const loadStatus = useCallback(async () => {
    if (!enabled) {
      return INITIAL_STATUS;
    }

    try {
      const response = await api.getOnboardingStatus();
      const nextStatus = normalizeStatus(response);
      const nextState = {
        loading: false,
        checked: true,
        error: '',
        ...nextStatus,
      };
      setState(nextState);
      return nextState;
    } catch (error) {
      const nextState = {
        ...INITIAL_STATUS,
        checked: true,
        error: error?.response?.data?.error || 'No se pudo validar la configuracion inicial.',
      };
      setState(nextState);
      return nextState;
    }
  }, [api, enabled]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return INITIAL_STATUS;
    }

    setState((previous) => ({
      ...previous,
      loading: true,
      checked: false,
      error: '',
    }));

    return loadStatus();
  }, [enabled, loadStatus]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del estado publico de onboarding
    loadStatus();
  }, [enabled, loadStatus]);

  const effectiveState = enabled ? state : INITIAL_STATUS;

  return {
    ...effectiveState,
    refresh,
  };
};

export {
  INITIAL_STATUS,
  normalizeStatus,
  useOnboardingStatus,
};
