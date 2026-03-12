import { estadoLabelTramite } from '../../../utils/estadosTramite.js';
import TRAMITE_LABELS from '../../../utils/tramiteLabels.js';
import {
  ESTADOS_TRAMITE,
  ROLES_ADMIN,
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
  rolActivo,
  setRolActivo
}) => ({
  ...headerViewModel,
  accionSiguiente,
  onAccionSiguiente: handleAccionSiguiente,
  historialVisible,
  onToggleHistorial: () => setHistorialVisible((prev) => !prev),
  rolActivo,
  onRolChange: setRolActivo,
  roles: ROLES_ADMIN,
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
  rolActivo,
  tramite,
  tesoreriaDestino,
  handleTesoreriaDestinoChange,
  handleDecision,
  handleAccionTesoreria,
  resumenTotales,
  resumenMoneda,
  sociedadLabel
}) => ({
  activeTab,
  documentos,
  documentosActivos,
  permisos: getPermisosTramite({ rolActivo, estado: tramite.estado }),
  destinosTesoreria: DESTINOS_TESORERIA,
  tesoreriaDestino,
  onDestinoChange: handleTesoreriaDestinoChange,
  onDecision: handleDecision,
  onAccionTesoreria: handleAccionTesoreria,
  resumenTotales,
  resumenMoneda,
  sociedadLabel,
  labelsDocumentos: TRAMITE_LABELS.documentos,
  labelsUnificada: TRAMITE_LABELS.unificada
});

export const buildTramiteDetalleLayoutProps = (input) => ({
  header: buildHeaderLayoutProps(input),
  tabs: buildTabsLayoutProps(input),
  alerts: buildAlertsLayoutProps(input),
  historial: buildHistorialLayoutProps(input),
  meta: buildMetaLayoutProps(input),
  pagos: buildPagosLayoutProps(input),
  retenciones: buildRetencionesLayoutProps(input),
  override: buildOverrideLayoutProps(input),
  table: buildTableLayoutProps(input)
});
