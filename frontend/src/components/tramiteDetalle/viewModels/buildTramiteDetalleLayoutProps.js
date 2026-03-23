import { estadoLabelTramite } from '../../../utils/estadosTramite.js';
import TRAMITE_LABELS from '../../../utils/tramiteLabels.js';
import {
  ESTADOS_TRAMITE,
  DESTINOS_TESORERIA
} from '../../../utils/tramiteConfig.js';
import getPermisosTramite, { hasPermission } from '../../../utils/tramitePermissions.js';
import {
  sortDocumentosByProveedor,
  sortProviderGroupsByProveedor
} from '../../../utils/tramiteProviderOrdering.js';

const buildOverrideEstados = () => (
  ESTADOS_TRAMITE.map((estado) => ({
    value: estado,
    label: estadoLabelTramite(estado)
  }))
);

export const buildHeaderLayoutProps = ({
  headerViewModel,
  accionSiguiente,
  handleAccionSiguiente,
  historialVisible,
  setHistorialVisible,
  permisosTramite,
  documentosActivos,
  reportLoading,
  exportReport
}) => ({
  ...headerViewModel,
  accionSiguiente: permisosTramite?.puedeAccionSiguiente ? accionSiguiente : null,
  onAccionSiguiente: handleAccionSiguiente,
  canExportReport: Array.isArray(documentosActivos) && documentosActivos.length > 0,
  exportReportLoading: reportLoading === true,
  onExportReport: exportReport,
  historialVisible,
  onToggleHistorial: () => setHistorialVisible((prev) => !prev),
  labels: TRAMITE_LABELS.headerActions
});

export const buildTabsLayoutProps = ({ activeTab, setActiveTab }) => ({
  activeTab,
  onChange: setActiveTab,
  labels: TRAMITE_LABELS.tabs
});

export const buildAlertsLayoutProps = ({
  actionError,
  actionMessage,
  reportError,
  reportMessage
}) => ({
  error: actionError,
  message: actionMessage,
  reportError,
  reportMessage
});

export const buildHistorialLayoutProps = ({
  historialVisible,
  historial,
  historialError
}) => ({
  visible: historialVisible,
  historial,
  historialError,
  labels: TRAMITE_LABELS.historial
});

export const buildMetaLayoutProps = ({ tramite, resumenTotales, resumenMoneda }) => ({
  tramite,
  resumenTotales,
  resumenMoneda
});

export const buildPagosLayoutProps = ({
  tramite,
  userPermissions,
  accionSiguiente,
  documentosActivos,
  pagosFacturas,
  handlePagoFacturaChange
}) => {
  const permisos = getPermisosTramite({ userPermissions, estado: tramite?.estado });

  return {
    visible: permisos?.puedeTesoreria
      && accionSiguiente?.estado === 'en_aprobacion_gerencia_contable'
      && documentosActivos.length > 0,
    documentosActivos,
    pagosFacturas,
    onPagoFacturaChange: handlePagoFacturaChange
  };
};

export const buildRetencionesLayoutProps = ({ retencionesActivas }) => ({
  retencionesActivas
});

const buildCaratulasReadiness = ({ tramite, documentosActivos, userPermissions }) => {
  const canManageCaratulas = hasPermission(userPermissions, 'documentos_tramitar_pago');
  const activeDocuments = Array.isArray(documentosActivos) ? documentosActivos : [];
  const gerenciaPendientesDocs = activeDocuments.filter((doc) => doc.estado_gerencia === 'pendiente');
  const gerenciaRechazadosDocs = activeDocuments.filter((doc) => doc.estado_gerencia === 'rechazado');
  const gerenciaAprobadosDocs = activeDocuments.filter((doc) => doc.estado_gerencia === 'aprobado');

  return {
    canManageCaratulas,
    showWaitingMessage: canManageCaratulas && tramite?.estado === 'en_aprobacion_gerencia',
    totalDocumentos: activeDocuments.length,
    gerenciaAprobados: gerenciaAprobadosDocs.length,
    gerenciaPendientes: gerenciaPendientesDocs.length,
    gerenciaRechazados: gerenciaRechazadosDocs.length,
    pendingDocuments: gerenciaPendientesDocs.slice(0, 3).map((doc) => (
      doc.consecutivo || doc.clave || `Factura ${doc.factura_id}`
    )),
  };
};

export const buildCaratulasLayoutProps = ({
  tramite,
  caratula,
  providerGroups,
  orphanGroups,
  documentosActivos,
  userPermissions,
  handleUploadCaratulas,
  handleResolveCaratulas,
  handleConfirmProviderOrder,
  handleUploadProviderCaratula,
  handleConfirmProviderCaratula,
  handleAssignOrphanCaratula,
  handleDiscardOrphanCaratula,
  uploadingCaratulas,
  resolvingCaratulaGroupKey,
  uploadingProviderKey,
  confirmingProviderKey,
  confirmingOrderProviderKey,
  orphanActionId,
  providerSortDirection,
  setProviderSortDirection,
  sociedadLabel
}) => {
  const permisos = getPermisosTramite({ userPermissions, estado: tramite.estado });
  const visible = permisos?.puedeTesoreria && tramite.estado === 'en_revision_tesoreria_1';

  return {
    visible,
    caratula,
    providerGroups,
    orphanGroups,
    tramiteEstado: tramite.estado,
    permisos,
    providerSortDirection,
    onToggleProviderSortDirection: () => setProviderSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')),
    readiness: buildCaratulasReadiness({
      tramite,
      documentosActivos,
      userPermissions,
    }),
    onUploadCaratulas: handleUploadCaratulas,
    onResolveCaratulas: handleResolveCaratulas,
    onConfirmProviderOrder: handleConfirmProviderOrder,
    onUploadProviderCaratula: handleUploadProviderCaratula,
    onConfirmProviderCaratula: handleConfirmProviderCaratula,
    onAssignOrphanCaratula: handleAssignOrphanCaratula,
    onDiscardOrphanCaratula: handleDiscardOrphanCaratula,
    uploadingCaratulas,
    resolvingCaratulaGroupKey,
    uploadingProviderKey,
    confirmingProviderKey,
    confirmingOrderProviderKey,
    orphanActionId,
    sociedadLabel,
    labels: TRAMITE_LABELS.caratulas
  };
};

export const buildOverrideLayoutProps = ({
  overrideUser,
  overrideEstado,
  overrideMotivo,
  overrideError,
  setOverrideUser,
  setOverrideEstado,
  setOverrideMotivo,
  handleOverrideEstado
}) => ({
  estados: buildOverrideEstados(),
  overrideUser,
  overrideEstado,
  overrideMotivo,
  overrideError,
  onUserChange: setOverrideUser,
  onEstadoChange: setOverrideEstado,
  onMotivoChange: setOverrideMotivo,
  onSubmit: handleOverrideEstado,
  labels: TRAMITE_LABELS.override
});

export const buildTableLayoutProps = ({
  activeTab,
  documentos,
  documentosActivos,
  caratula,
  providerGroups,
  providerSortDirection,
  tramite,
  userPermissions,
  tesoreriaDestino,
  handleTesoreriaDestinoChange,
  handleDecision,
  handleAccionTesoreria,
  resumenTotales,
  resumenMoneda,
  sociedadLabel,
  sociedadId
}) => ({
  activeTab,
  documentos: sortDocumentosByProveedor({
    documentos,
    providerGroups,
    direction: providerSortDirection
  }),
  documentosActivos,
  caratula,
  providerGroups: sortProviderGroupsByProveedor({
    providerGroups,
    direction: providerSortDirection
  }),
  permisos: getPermisosTramite({ userPermissions, estado: tramite.estado }),
  destinosTesoreria: DESTINOS_TESORERIA,
  tesoreriaDestino,
  onDestinoChange: handleTesoreriaDestinoChange,
  onDecision: handleDecision,
  onAccionTesoreria: handleAccionTesoreria,
  resumenTotales,
  resumenMoneda,
  sociedadLabel,
  sociedadId,
  labelsDocumentos: TRAMITE_LABELS.documentos,
  labelsUnificada: TRAMITE_LABELS.unificada
});

export const buildTramiteDetalleLayoutProps = (input) => {
  const permisosTramite = getPermisosTramite({
    userPermissions: input.userPermissions,
    estado: input.tramite?.estado
  });

  return {
    header: buildHeaderLayoutProps({
      ...input,
      permisosTramite
    }),
    tabs: buildTabsLayoutProps(input),
    alerts: buildAlertsLayoutProps(input),
    historial: buildHistorialLayoutProps(input),
    meta: buildMetaLayoutProps(input),
    pagos: buildPagosLayoutProps(input),
    retenciones: buildRetencionesLayoutProps(input),
    caratulas: buildCaratulasLayoutProps(input),
    override: buildOverrideLayoutProps(input),
    table: buildTableLayoutProps(input)
  };
};
