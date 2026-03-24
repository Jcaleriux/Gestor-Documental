export const buildTramiteDetalleOutputContract = ({
  state,
  fetchDetalle,
  fetchHistorial
}) => ({
  tramite: state.tramite,
  documentos: state.documentos,
  retenciones: state.retenciones,
  caratula: state.caratula,
  providerGroups: state.providerGroups,
  orphanGroups: state.orphanGroups,
  loading: state.loading,
  actionMessage: state.actionMessage,
  setActionMessage: state.setActionMessage,
  actionError: state.actionError,
  setActionError: state.setActionError,
  historial: state.historial,
  historialError: state.historialError,
  fetchDetalle,
  fetchHistorial,
  sociedadInfo: state.sociedadInfo
});
