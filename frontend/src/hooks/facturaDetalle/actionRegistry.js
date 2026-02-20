import { createCommentEstadoActions } from './commentEstadoActions.js';
import { createContabilizacionActions } from './contabilizacionActions.js';
import { createDocumentActions } from './documentActions.js';

const createCommentEstadoActionModule = (context) => createCommentEstadoActions({
  id: context.id,
  factura: context.factura,
  commentUser: context.commentUser,
  commentText: context.commentText,
  estadoNuevo: context.estadoNuevo,
  estadoUser: context.estadoUser,
  estadoMotivo: context.estadoMotivo,
  fetchAll: context.fetchAll,
  setComentarios: context.setComentarios,
  setCommentText: context.setCommentText,
  setEstadoMotivo: context.setEstadoMotivo,
  setEstadoNuevo: context.setEstadoNuevo,
  facturaApi: context.facturaApi
});

const createContabilizacionActionModule = (context) => createContabilizacionActions({
  id: context.id,
  factura: context.factura,
  conta: context.conta,
  proveedoresSociedad: context.proveedoresSociedad,
  setConta: context.setConta,
  setContaSaving: context.setContaSaving,
  setContaMessage: context.setContaMessage,
  setContaError: context.setContaError,
  setTablasPagoProveedor: context.setTablasPagoProveedor,
  setTablaPagoActual: context.setTablaPagoActual,
  setTablasModalOpen: context.setTablasModalOpen,
  setTablasError: context.setTablasError,
  setTablasLoading: context.setTablasLoading,
  setNotasCreditoProveedor: context.setNotasCreditoProveedor,
  setNotaCreditoActual: context.setNotaCreditoActual,
  setNotasModalOpen: context.setNotasModalOpen,
  setNotasError: context.setNotasError,
  setNotasLoading: context.setNotasLoading,
  retencionPagoMonto: context.retencionPagoMonto,
  retencionPagoFecha: context.retencionPagoFecha,
  retencionPagoNotas: context.retencionPagoNotas,
  setRetencionPagoMonto: context.setRetencionPagoMonto,
  setRetencionPagoNotas: context.setRetencionPagoNotas,
  setRetencionPagoSaving: context.setRetencionPagoSaving,
  setRetencionPagoError: context.setRetencionPagoError,
  setRetencionPagoMessage: context.setRetencionPagoMessage,
  fetchAll: context.fetchAll,
  facturaApi: context.facturaApi
});

const createDocumentActionModule = (context) => createDocumentActions({
  id: context.id,
  factura: context.factura,
  tablaPagoActual: context.tablaPagoActual,
  notaCreditoActual: context.notaCreditoActual,
  setMhLoading: context.setMhLoading,
  setMhError: context.setMhError,
  facturaApi: context.facturaApi,
  buildAuthUrl: context.buildAuthUrl,
  openWindow: context.openWindow
});

const ensureUniqueActionName = ({ actionName, moduleName, registry }) => {
  if (registry[actionName]) {
    throw new Error(`FacturaDetalle action duplicated: "${actionName}" from module "${moduleName}"`);
  }
};

const mergeModuleActions = ({ modules, context }) => {
  return modules.reduce((registry, createModuleActions, index) => {
    if (typeof createModuleActions !== 'function') {
      return registry;
    }

    const moduleName = createModuleActions.name || `module_${index + 1}`;
    const moduleActions = createModuleActions(context) || {};

    Object.entries(moduleActions).forEach(([actionName, actionHandler]) => {
      ensureUniqueActionName({ actionName, moduleName, registry });
      registry[actionName] = actionHandler;
    });

    return registry;
  }, {});
};

const defaultActionModules = [
  createCommentEstadoActionModule,
  createContabilizacionActionModule,
  createDocumentActionModule
];

export {
  defaultActionModules,
  mergeModuleActions
};
