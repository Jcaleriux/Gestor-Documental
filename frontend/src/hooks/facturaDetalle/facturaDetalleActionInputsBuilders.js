export const buildCommentEstadoModuleInputs = ({ id, data }) => ({
  id,
  factura: data.factura,
  commentUser: data.commentUser,
  commentText: data.commentText,
  estadoNuevo: data.estadoNuevo,
  estadoUser: data.estadoUser,
  estadoMotivo: data.estadoMotivo,
  fetchAll: data.fetchAll,
  setComentarios: data.setComentarios,
  setCommentText: data.setCommentText,
  setEstadoMotivo: data.setEstadoMotivo,
  setEstadoNuevo: data.setEstadoNuevo
});

export const buildContabilizacionCoreActionInputs = ({ id, data }) => ({
  id,
  factura: data.factura,
  conta: data.conta,
  proveedoresSociedad: data.proveedoresSociedad,
  setConta: data.setConta,
  setContaSaving: data.setContaSaving,
  setContaMessage: data.setContaMessage,
  setContaError: data.setContaError,
  fetchAll: data.fetchAll
});

export const buildContabilizacionTablasActionInputs = ({ data }) => ({
  setTablasPagoProveedor: data.setTablasPagoProveedor,
  setTablaPagoActual: data.setTablaPagoActual,
  setTablasModalOpen: data.setTablasModalOpen,
  setTablasError: data.setTablasError,
  setTablasLoading: data.setTablasLoading
});

export const buildContabilizacionOrdenesActionInputs = ({ data }) => ({
  setOrdenesCompraProveedor: data.setOrdenesCompraProveedor,
  setOrdenCompraActual: data.setOrdenCompraActual,
  setOrdenesModalOpen: data.setOrdenesModalOpen,
  setOrdenesError: data.setOrdenesError,
  setOrdenesLoading: data.setOrdenesLoading
});

export const buildContabilizacionNotasActionInputs = ({ data }) => ({
  setNotasCreditoProveedor: data.setNotasCreditoProveedor,
  setNotaCreditoActual: data.setNotaCreditoActual,
  setNotasModalOpen: data.setNotasModalOpen,
  setNotasError: data.setNotasError,
  setNotasLoading: data.setNotasLoading
});

export const buildContabilizacionRetencionActionInputs = ({ data }) => ({
  retencionPagoMonto: data.retencionPagoMonto,
  retencionPagoFecha: data.retencionPagoFecha,
  retencionPagoNotas: data.retencionPagoNotas,
  setRetencionPagoMonto: data.setRetencionPagoMonto,
  setRetencionPagoNotas: data.setRetencionPagoNotas,
  setRetencionPagoSaving: data.setRetencionPagoSaving,
  setRetencionPagoError: data.setRetencionPagoError,
  setRetencionPagoMessage: data.setRetencionPagoMessage
});

export const buildContabilizacionModuleInputs = ({ id, data }) => ({
  ...buildContabilizacionCoreActionInputs({ id, data }),
  ...buildContabilizacionTablasActionInputs({ data }),
  ...buildContabilizacionOrdenesActionInputs({ data }),
  ...buildContabilizacionNotasActionInputs({ data }),
  ...buildContabilizacionRetencionActionInputs({ data })
});

export const buildDocumentModuleInputs = ({ id, data }) => ({
  id,
  factura: data.factura,
  tablaPagoActual: data.tablaPagoActual,
  ordenCompraActual: data.ordenCompraActual,
  notaCreditoActual: data.notaCreditoActual,
  setMhLoading: data.setMhLoading,
  setMhError: data.setMhError
});

export const buildFacturaDetalleActionModuleInputs = ({ id, data }) => ({
  commentEstado: buildCommentEstadoModuleInputs({ id, data }),
  contabilizacion: buildContabilizacionModuleInputs({ id, data }),
  document: buildDocumentModuleInputs({ id, data })
});
