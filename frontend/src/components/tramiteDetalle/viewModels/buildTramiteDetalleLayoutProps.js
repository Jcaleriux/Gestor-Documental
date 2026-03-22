import { estadoLabelTramite } from '../../../utils/estadosTramite.js';
import TRAMITE_LABELS from '../../../utils/tramiteLabels.js';
import {
  ESTADOS_TRAMITE,
  DESTINOS_TESORERIA
} from '../../../utils/tramiteConfig.js';
import getPermisosTramite from '../../../utils/tramitePermissions.js';

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
  permisosTramite
}) => ({
  ...headerViewModel,
  accionSiguiente: permisosTramite?.puedeAccionSiguiente ? accionSiguiente : null,
  onAccionSiguiente: handleAccionSiguiente,
  historialVisible,
  onToggleHistorial: () => setHistorialVisible((prev) => !prev),
  labels: TRAMITE_LABELS.headerActions
});

export const buildTabsLayoutProps = ({ activeTab, setActiveTab }) => ({
  activeTab,
  onChange: setActiveTab,
  labels: TRAMITE_LABELS.tabs
});

export const buildAlertsLayoutProps = ({ actionError, actionMessage }) => ({
  error: actionError,
  message: actionMessage
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
  accionSiguiente,
  documentosActivos,
  pagosFacturas,
  handlePagoFacturaChange
}) => ({
  visible: accionSiguiente?.estado === 'pagado' && documentosActivos.length > 0,
  documentosActivos,
  pagosFacturas,
  onPagoFacturaChange: handlePagoFacturaChange
});

export const buildRetencionesLayoutProps = ({ retencionesActivas }) => ({
  retencionesActivas
});

export const buildCaratulasLayoutProps = ({
  tramite,
  caratula,
  providerGroups,
  userPermissions,
  handleUploadCaratulas,
  handleResolveCaratulas,
  uploadingCaratulas,
  resolvingCaratulaGroupKey,
  sociedadLabel
}) => ({
  caratula,
  providerGroups,
  tramiteEstado: tramite.estado,
  permisos: getPermisosTramite({ userPermissions, estado: tramite.estado }),
  onUploadCaratulas: handleUploadCaratulas,
  onResolveCaratulas: handleResolveCaratulas,
  uploadingCaratulas,
  resolvingCaratulaGroupKey,
  sociedadLabel,
  labels: TRAMITE_LABELS.caratulas
});

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
  documentos,
  documentosActivos,
  caratula,
  providerGroups,
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
