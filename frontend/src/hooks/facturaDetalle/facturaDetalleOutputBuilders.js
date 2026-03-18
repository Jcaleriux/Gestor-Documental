export const buildFacturaDetalleMetaOutput = (data, options = {}) => ({
  factura: data.factura,
  comentarios: data.comentarios,
  estados: data.estados,
  loading: data.loading,
  error: data.error,
  selectedSociedadName: options.selectedSociedadName || '',
  canEditContabilizacion: Boolean(options.canEditContabilizacion)
});

export const buildFacturaDetalleGeneralStateOutput = (data) => ({
  commentUser: data.commentUser,
  setCommentUser: data.setCommentUser,
  commentText: data.commentText,
  setCommentText: data.setCommentText,
  estadoNuevo: data.estadoNuevo,
  setEstadoNuevo: data.setEstadoNuevo,
  estadoUser: data.estadoUser,
  setEstadoUser: data.setEstadoUser,
  estadoMotivo: data.estadoMotivo,
  setEstadoMotivo: data.setEstadoMotivo,
  mhLoading: data.mhLoading,
  mhError: data.mhError
});

export const buildFacturaDetalleContabilizacionStateOutput = (data) => ({
  conta: data.conta,
  proveedoresSociedad: data.proveedoresSociedad,
  tablasPagoProveedor: data.tablasPagoProveedor,
  tablaPagoActual: data.tablaPagoActual,
  tablasModalOpen: data.tablasModalOpen,
  setTablasModalOpen: data.setTablasModalOpen,
  tablasLoading: data.tablasLoading,
  tablasError: data.tablasError,
  ordenesCompraProveedor: data.ordenesCompraProveedor,
  ordenCompraActual: data.ordenCompraActual,
  ordenesModalOpen: data.ordenesModalOpen,
  setOrdenesModalOpen: data.setOrdenesModalOpen,
  ordenesLoading: data.ordenesLoading,
  ordenesError: data.ordenesError,
  notasCreditoProveedor: data.notasCreditoProveedor,
  notaCreditoActual: data.notaCreditoActual,
  notasModalOpen: data.notasModalOpen,
  setNotasModalOpen: data.setNotasModalOpen,
  notasLoading: data.notasLoading,
  notasError: data.notasError,
  contaSaving: data.contaSaving,
  contaSavingAction: data.contaSavingAction,
  contaMessage: data.contaMessage,
  contaError: data.contaError
});

export const buildFacturaDetalleRetencionStateOutput = (data) => ({
  retencionPagos: data.retencionPagos,
  retencionPagoMonto: data.retencionPagoMonto,
  setRetencionPagoMonto: data.setRetencionPagoMonto,
  retencionPagoFecha: data.retencionPagoFecha,
  setRetencionPagoFecha: data.setRetencionPagoFecha,
  retencionPagoNotas: data.retencionPagoNotas,
  setRetencionPagoNotas: data.setRetencionPagoNotas,
  retencionPagoSaving: data.retencionPagoSaving,
  retencionPagoError: data.retencionPagoError,
  retencionPagoMessage: data.retencionPagoMessage
});

export const buildFacturaDetalleActionsOutput = (actions) => ({
  addComment: actions.addComment,
  changeEstado: actions.changeEstado,
  handleContaChange: actions.handleContaChange,
  abrirAsociarTablaPago: actions.abrirAsociarTablaPago,
  asociarTablaPago: actions.asociarTablaPago,
  abrirAsociarOrdenCompra: actions.abrirAsociarOrdenCompra,
  asociarOrdenCompra: actions.asociarOrdenCompra,
  abrirAsociarNotaCredito: actions.abrirAsociarNotaCredito,
  asociarNotaCredito: actions.asociarNotaCredito,
  verTablaPagoAsociada: actions.verTablaPagoAsociada,
  verOrdenCompraAsociada: actions.verOrdenCompraAsociada,
  verNotaCreditoAsociada: actions.verNotaCreditoAsociada,
  guardarBorrador: actions.guardarBorrador,
  marcarEnRevision: actions.marcarEnRevision,
  guardarContabilizacion: actions.guardarContabilizacion,
  registrarPagoRetencion: actions.registrarPagoRetencion,
  verMensajeHacienda: actions.verMensajeHacienda,
  verManifest: actions.verManifest
});

export const buildFacturaDetalleOutputContract = ({
  data,
  actions,
  selectedSociedadName,
  canEditContabilizacion
}) => ({
  meta: buildFacturaDetalleMetaOutput(data, {
    selectedSociedadName,
    canEditContabilizacion
  }),
  state: {
    general: buildFacturaDetalleGeneralStateOutput(data),
    contabilizacion: buildFacturaDetalleContabilizacionStateOutput(data),
    retencion: buildFacturaDetalleRetencionStateOutput(data)
  },
  actions: buildFacturaDetalleActionsOutput(actions)
});

export const buildFacturaDetalleViewModelInput = (outputContract) => ({
  ...outputContract.meta,
  ...outputContract.state.general,
  ...outputContract.state.contabilizacion,
  ...outputContract.state.retencion,
  ...outputContract.actions
});
