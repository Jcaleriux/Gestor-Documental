import { defaultActionModules, mergeModuleActions } from './actionRegistry.js';
import { facturaDetalleApi } from '../../services/facturaDetalleApi.js';
import { withAuthToken } from '../../utils/auth.js';

const defaultOpenWindow = (...args) => {
  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    return null;
  }
  return window.open(...args);
};

export const useFacturaDetalleActions = ({
  id,
  factura,
  conta,
  proveedoresSociedad,
  tablaPagoActual,
  notaCreditoActual,
  commentUser,
  commentText,
  estadoNuevo,
  estadoUser,
  estadoMotivo,
  retencionPagoMonto,
  retencionPagoFecha,
  retencionPagoNotas,
  fetchAll,
  setComentarios,
  setCommentText,
  setEstadoMotivo,
  setEstadoNuevo,
  setConta,
  setContaSaving,
  setContaMessage,
  setContaError,
  setTablasPagoProveedor,
  setTablaPagoActual,
  setTablasModalOpen,
  setTablasError,
  setTablasLoading,
  setNotasCreditoProveedor,
  setNotaCreditoActual,
  setNotasModalOpen,
  setNotasError,
  setNotasLoading,
  setRetencionPagoMonto,
  setRetencionPagoNotas,
  setRetencionPagoSaving,
  setRetencionPagoError,
  setRetencionPagoMessage,
  setMhLoading,
  setMhError,
  dependencies = {}
}) => {
  const {
    facturaApi = facturaDetalleApi,
    buildAuthUrl = withAuthToken,
    openWindow = defaultOpenWindow,
    actionModules = defaultActionModules
  } = dependencies;

  const context = {
    id,
    factura,
    conta,
    proveedoresSociedad,
    tablaPagoActual,
    notaCreditoActual,
    commentUser,
    commentText,
    estadoNuevo,
    estadoUser,
    estadoMotivo,
    fetchAll,
    setComentarios,
    setCommentText,
    setEstadoMotivo,
    setEstadoNuevo,
    setConta,
    setContaSaving,
    setContaMessage,
    setContaError,
    setTablasPagoProveedor,
    setTablaPagoActual,
    setTablasModalOpen,
    setTablasError,
    setTablasLoading,
    setNotasCreditoProveedor,
    setNotaCreditoActual,
    setNotasModalOpen,
    setNotasError,
    setNotasLoading,
    retencionPagoMonto,
    retencionPagoFecha,
    retencionPagoNotas,
    setRetencionPagoMonto,
    setRetencionPagoNotas,
    setRetencionPagoSaving,
    setRetencionPagoError,
    setRetencionPagoMessage,
    setMhLoading,
    setMhError,
    facturaApi,
    buildAuthUrl,
    openWindow
  };

  return mergeModuleActions({
    modules: actionModules,
    context
  });
};
