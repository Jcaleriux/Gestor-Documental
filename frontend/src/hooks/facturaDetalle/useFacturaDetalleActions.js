import { defaultActionModules, mergeModuleActions } from './actionRegistry.js';
import { facturaDetalleApi } from '../../services/facturaDetalleApi.js';
import {
  createProtectedResourceOpener,
  openProtectedInNewTab,
} from '../../utils/protectedResources.js';

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
    buildAuthUrl,
    openWindow,
    openProtectedResource = openProtectedInNewTab,
    actionModules = defaultActionModules
  } = dependencies;
  const resolvedOpenProtectedResource = createProtectedResourceOpener({
    openProtectedResource,
    buildAuthUrl,
    openWindow,
  });

  const normalizedModuleInputs = normalizeModuleInputs(moduleInputs);

  const sharedDependencies = {
    facturaApi,
    buildAuthUrl,
    openWindow,
    openProtectedResource: resolvedOpenProtectedResource
  };

  return mergeModuleActions({
    modules: actionModules,
    moduleInputs: normalizedModuleInputs,
    shared: sharedDependencies
  });
};
