import { buildTramiteDetallePageState } from './buildTramiteDetallePageState.js';
import { buildTramiteDetalleHeaderViewModel } from './buildTramiteDetalleHeaderViewModel.js';
import { buildTramiteDetalleLayoutProps } from './buildTramiteDetalleLayoutProps.js';

export const buildTramiteWorkflowInputs = ({
  id,
  tramite,
  documentosActivos,
  authUser = null,
  fetchDetalle,
  fetchHistorial,
  setActionMessage,
  setActionError,
}) => ({
  id,
  tramite,
  documentosActivos,
  actorUsuario: authUser?.email || authUser?.nombre || 'system',
  fetchDetalle,
  fetchHistorial,
  setActionMessage,
  setActionError,
});

export const buildSociedadLabel = ({ sociedadInfo, sociedadId }) => (
  sociedadInfo?.nombre_proyecto || sociedadInfo?.razon_social || sociedadId || '-'
);

export const buildTramiteDetallePageViewModel = ({
  sociedadId,
  detalle,
  documentosActivos,
  retencionesActivas,
  resumenTotales,
  resumenMoneda,
  workflow,
  report,
  sociedadLabel: providedSociedadLabel,
  userPermissions = [],
}) => {
  const pageState = buildTramiteDetallePageState({
    sociedadId,
    loading: detalle.loading,
    tramite: detalle.tramite,
  });

  if (pageState.status !== 'ready') {
    return {
      pageState,
      layoutProps: null,
    };
  }

  const headerViewModel = buildTramiteDetalleHeaderViewModel({
    tramite: detalle.tramite,
  });
  const sociedadLabel = providedSociedadLabel || buildSociedadLabel({
    sociedadInfo: detalle.sociedadInfo,
    sociedadId,
  });

  const layoutProps = buildTramiteDetalleLayoutProps({
    headerViewModel,
    tramite: detalle.tramite,
    documentos: detalle.documentos,
    documentosActivos,
    caratula: detalle.caratula,
    providerGroups: detalle.providerGroups,
    orphanGroups: detalle.orphanGroups,
    retencionesActivas,
    resumenTotales,
    resumenMoneda,
    accionSiguiente: workflow.accionSiguiente,
    handleAccionSiguiente: workflow.handleAccionSiguiente,
    historialVisible: workflow.historialVisible,
    setHistorialVisible: workflow.setHistorialVisible,
    userPermissions,
    activeTab: workflow.activeTab,
    setActiveTab: workflow.setActiveTab,
    actionError: detalle.actionError,
    actionMessage: detalle.actionMessage,
    historial: detalle.historial,
    historialError: detalle.historialError,
    pagosFacturas: workflow.pagosFacturas,
    handlePagoFacturaChange: workflow.handlePagoFacturaChange,
    overrideUser: workflow.overrideUser,
    overrideEstado: workflow.overrideEstado,
    overrideMotivo: workflow.overrideMotivo,
    overrideError: workflow.overrideError,
    setOverrideUser: workflow.setOverrideUser,
    setOverrideEstado: workflow.setOverrideEstado,
    setOverrideMotivo: workflow.setOverrideMotivo,
    handleOverrideEstado: workflow.handleOverrideEstado,
    tesoreriaDestino: workflow.tesoreriaDestino,
    handleTesoreriaDestinoChange: workflow.handleTesoreriaDestinoChange,
    handleDecision: workflow.handleDecision,
    handleAccionTesoreria: workflow.handleAccionTesoreria,
    handleUploadCaratulas: workflow.handleUploadCaratulas,
    handleResolveCaratulas: workflow.handleResolveCaratulas,
    handleConfirmProviderOrder: workflow.handleConfirmProviderOrder,
    handleUploadProviderCaratula: workflow.handleUploadProviderCaratula,
    handleConfirmProviderCaratula: workflow.handleConfirmProviderCaratula,
    handleAssignOrphanCaratula: workflow.handleAssignOrphanCaratula,
    handleDiscardOrphanCaratula: workflow.handleDiscardOrphanCaratula,
    uploadingCaratulas: workflow.uploadingCaratulas,
    resolvingCaratulaGroupKey: workflow.resolvingCaratulaGroupKey,
    uploadingProviderKey: workflow.uploadingProviderKey,
    confirmingProviderKey: workflow.confirmingProviderKey,
    confirmingOrderProviderKey: workflow.confirmingOrderProviderKey,
    orphanActionId: workflow.orphanActionId,
    providerSortDirection: workflow.providerSortDirection,
    setProviderSortDirection: workflow.setProviderSortDirection,
    sociedadLabel,
    sociedadId,
    reportLoading: report?.reportLoading,
    reportError: report?.reportError,
    reportMessage: report?.reportMessage,
    exportReport: report?.exportReport,
  });

  return {
    pageState,
    layoutProps,
  };
};
