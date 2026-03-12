import { defaultActionModules, mergeModuleActions } from './actionRegistry.js';
import { facturaDetalleApi } from '../../services/facturaDetalleApi.js';
import { withAuthToken } from '../../utils/auth.js';

const defaultOpenWindow = (...args) => {
  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    return null;
  }
  return window.open(...args);
};

const normalizeModuleInputs = (moduleInputs = {}) => ({
  commentEstado: moduleInputs.commentEstado || {},
  contabilizacion: moduleInputs.contabilizacion || {},
  document: moduleInputs.document || {}
});

const ensureNoLegacyActionInputs = (params) => {
  if (Object.prototype.hasOwnProperty.call(params, 'actionInputs')) {
    throw new Error('useFacturaDetalleActions: actionInputs ya no es soportado. Use moduleInputs.');
  }
};

export const useFacturaDetalleActions = (params = {}) => {
  ensureNoLegacyActionInputs(params);

  const {
    moduleInputs,
    dependencies = {}
  } = params;

  const {
    facturaApi = facturaDetalleApi,
    buildAuthUrl = withAuthToken,
    openWindow = defaultOpenWindow,
    actionModules = defaultActionModules
  } = dependencies;

  const normalizedModuleInputs = normalizeModuleInputs(moduleInputs);

  const sharedDependencies = {
    facturaApi,
    buildAuthUrl,
    openWindow
  };

  return mergeModuleActions({
    modules: actionModules,
    moduleInputs: normalizedModuleInputs,
    shared: sharedDependencies
  });
};
