export const normalizeTramiteWorkflowInputs = ({
  workflowInputs,
  id,
  tramite,
  documentosActivos,
  actorUsuario,
  fetchDetalle,
  fetchHistorial,
  setActionMessage,
  setActionError
}) => {
  if (workflowInputs) {
    return workflowInputs;
  }

  return {
    id,
    tramite,
    documentosActivos,
    actorUsuario,
    fetchDetalle,
    fetchHistorial,
    setActionMessage,
    setActionError
  };
};

export const buildTramiteWorkflowStateInputs = (workflowInputs) => ({
  id: workflowInputs.id,
  tramite: workflowInputs.tramite,
  documentosActivos: workflowInputs.documentosActivos,
  actorUsuario: workflowInputs.actorUsuario,
  fetchHistorial: workflowInputs.fetchHistorial
});

export const buildTramiteWorkflowActionsOutput = ({
  workflowState,
  handlers
}) => ({
  historialVisible: workflowState.historialVisible,
  setHistorialVisible: workflowState.setHistorialVisible,
  overrideEstado: workflowState.overrideEstado,
  setOverrideEstado: workflowState.setOverrideEstado,
  overrideMotivo: workflowState.overrideMotivo,
  setOverrideMotivo: workflowState.setOverrideMotivo,
  overrideUser: workflowState.overrideUser,
  setOverrideUser: workflowState.setOverrideUser,
  overrideError: workflowState.overrideError,
  tesoreriaDestino: workflowState.tesoreriaDestino,
  pagosFacturas: workflowState.pagosFacturas,
  activeTab: workflowState.activeTab,
  setActiveTab: workflowState.setActiveTab,
  accionSiguiente: workflowState.accionSiguiente,
  handleDecision: handlers.handleDecision,
  handleAccionTesoreria: handlers.handleAccionTesoreria,
  handleOverrideEstado: handlers.handleOverrideEstado,
  handleTesoreriaDestinoChange: workflowState.handleTesoreriaDestinoChange,
  handlePagoFacturaChange: workflowState.handlePagoFacturaChange,
  handleAccionSiguiente: handlers.handleAccionSiguiente
});
