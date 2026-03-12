import { useParams } from 'react-router-dom';
import { useTramiteDetalle } from '../hooks/useTramiteDetalle';
import { LOADING_LABELS } from '../utils/uiLabels';
import LoadingState from './common/LoadingState';
import useTramiteResumen from '../hooks/useTramiteResumen';
import { useTramiteWorkflowActions } from '../hooks/tramiteDetalle/useTramiteWorkflowActions';
import TramiteDetalleLayout from './tramiteDetalle/TramiteDetalleLayout';
import { buildTramiteDetallePageState } from './tramiteDetalle/viewModels/buildTramiteDetallePageState.js';
import { buildTramiteDetalleHeaderViewModel } from './tramiteDetalle/viewModels/buildTramiteDetalleHeaderViewModel.js';
import { buildTramiteDetalleLayoutProps } from './tramiteDetalle/viewModels/buildTramiteDetalleLayoutProps.js';

function TramiteDetalle({ sociedadId }) {
  const { id } = useParams();
  const {
    tramite,
    documentos,
    retenciones,
    loading,
    actionMessage,
    setActionMessage,
    actionError,
    setActionError,
    historial,
    historialError,
    fetchDetalle,
    fetchHistorial,
    sociedadInfo
  } = useTramiteDetalle({ id, sociedadId });

  const { documentosActivos, retencionesActivas, resumenTotales, resumenMoneda } = useTramiteResumen(documentos, retenciones);

  const workflowInputs = {
    id,
    tramite,
    documentosActivos,
    fetchDetalle,
    fetchHistorial,
    setActionMessage,
    setActionError
  };

  const {
    rolActivo,
    setRolActivo,
    historialVisible,
    setHistorialVisible,
    overrideEstado,
    setOverrideEstado,
    overrideMotivo,
    setOverrideMotivo,
    overrideUser,
    setOverrideUser,
    overrideError,
    tesoreriaDestino,
    pagosFacturas,
    activeTab,
    setActiveTab,
    accionSiguiente,
    handleDecision,
    handleAccionTesoreria,
    handleOverrideEstado,
    handleTesoreriaDestinoChange,
    handlePagoFacturaChange,
    handleAccionSiguiente
  } = useTramiteWorkflowActions({ workflowInputs });

  const pageState = buildTramiteDetallePageState({
    sociedadId,
    loading,
    tramite
  });

  if (pageState.status === 'loading') {
    return <LoadingState label={LOADING_LABELS.tramiteDetalle} />;
  }

  if (pageState.status !== 'ready') {
    return <p>{pageState.message}</p>;
  }

  const sociedadLabel = sociedadInfo?.nombre_proyecto || sociedadInfo?.razon_social || sociedadId || '-';
  const headerViewModel = buildTramiteDetalleHeaderViewModel({ tramite });
  const layoutProps = buildTramiteDetalleLayoutProps({
    headerViewModel,
    tramite,
    documentos,
    documentosActivos,
    retencionesActivas,
    resumenTotales,
    resumenMoneda,
    accionSiguiente,
    handleAccionSiguiente,
    historialVisible,
    setHistorialVisible,
    rolActivo,
    setRolActivo,
    activeTab,
    setActiveTab,
    actionError,
    actionMessage,
    historial,
    historialError,
    pagosFacturas,
    handlePagoFacturaChange,
    overrideUser,
    overrideEstado,
    overrideMotivo,
    overrideError,
    setOverrideUser,
    setOverrideEstado,
    setOverrideMotivo,
    handleOverrideEstado,
    tesoreriaDestino,
    handleTesoreriaDestinoChange,
    handleDecision,
    handleAccionTesoreria,
    sociedadLabel
  });

  return <TramiteDetalleLayout layoutProps={layoutProps} />;
}

export default TramiteDetalle;
