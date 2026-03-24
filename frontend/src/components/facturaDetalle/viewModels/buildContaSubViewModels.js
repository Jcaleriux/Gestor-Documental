const formatOrdenLabel = (orden) => (
  `${orden.nombre} | ${orden.moneda || '-'} ${Number(orden.monto_disponible || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
);

export const buildContaFormViewModel = ({ detalle }) => ({
  conta: detalle.conta,
  canEditContabilizacion: Boolean(detalle.canEditContabilizacion),
  isReadOnly: !detalle.canEditContabilizacion,
  facturaEstado: detalle.factura?.estado || '',
  factura: detalle.factura,
  contaSaving: detalle.contaSaving,
  contaSavingAction: detalle.contaSavingAction,
  contaMessage: detalle.contaMessage,
  contaError: detalle.contaError,
  centrosCostoCatalogo: detalle.centrosCostoCatalogo,
  centrosCostoModalOpen: detalle.centrosCostoModalOpen,
  centrosCostoTargetLineId: detalle.centrosCostoTargetLineId,
  centrosCostoLoading: detalle.centrosCostoLoading,
  centrosCostoError: detalle.centrosCostoError,
  handleContaChange: detalle.handleContaChange,
  addCentroCostoLinea: detalle.addCentroCostoLinea,
  removeCentroCostoLinea: detalle.removeCentroCostoLinea,
  actualizarMontoCentroCosto: detalle.actualizarMontoCentroCosto,
  abrirSelectorCentrosCosto: detalle.abrirSelectorCentrosCosto,
  cerrarSelectorCentrosCosto: detalle.cerrarSelectorCentrosCosto,
  seleccionarCentroCostoEnLinea: detalle.seleccionarCentroCostoEnLinea,
  guardarBorrador: detalle.guardarBorrador,
  marcarEnRevision: detalle.marcarEnRevision,
  guardarContabilizacion: detalle.guardarContabilizacion
});

export const buildContaAssociationsViewModel = ({ detalle }) => ({
  canEditContabilizacion: Boolean(detalle.canEditContabilizacion),
  tablasLoading: detalle.tablasLoading,
  ordenesLoading: detalle.ordenesLoading,
  notasLoading: detalle.notasLoading,
  tablaPagoActual: detalle.tablaPagoActual,
  ordenCompraActual: detalle.ordenCompraActual,
  notaCreditoActual: detalle.notaCreditoActual,
  documentosRespaldoActuales: detalle.documentosRespaldoActuales,
  abrirAsociarTablaPago: detalle.abrirAsociarTablaPago,
  abrirAsociarOrdenCompra: detalle.abrirAsociarOrdenCompra,
  abrirAsociarNotaCredito: detalle.abrirAsociarNotaCredito,
  desenlazarOrdenCompra: detalle.desenlazarOrdenCompra,
  verTablaPagoAsociada: detalle.verTablaPagoAsociada,
  verOrdenCompraAsociada: detalle.verOrdenCompraAsociada,
  verNotaCreditoAsociada: detalle.verNotaCreditoAsociada,
  verDocumentoRespaldo: detalle.verDocumentoRespaldo,
  subirDocumentosRespaldo: detalle.subirDocumentosRespaldo,
  eliminarDocumentoRespaldo: detalle.eliminarDocumentoRespaldo
});

export const buildTablasModalViewModel = ({ detalle }) => ({
  isOpen: detalle.tablasModalOpen,
  error: detalle.tablasError,
  items: detalle.tablasPagoProveedor,
  onClose: () => detalle.setTablasModalOpen(false),
  onSelect: detalle.asociarTablaPago,
  renderLabel: (tabla) => tabla.nombre
});

export const buildNotasModalViewModel = ({ detalle }) => ({
  isOpen: detalle.notasModalOpen,
  error: detalle.notasError,
  items: detalle.notasCreditoProveedor,
  onClose: () => detalle.setNotasModalOpen(false),
  onSelect: detalle.asociarNotaCredito,
  renderLabel: (nota) => nota.clave || `Nota #${nota.id}`
});

export const buildOrdenesModalViewModel = ({ detalle }) => ({
  isOpen: detalle.ordenesModalOpen,
  error: detalle.ordenesError,
  items: detalle.ordenesCompraProveedor,
  onClose: () => detalle.setOrdenesModalOpen(false),
  onSelect: detalle.asociarOrdenCompra,
  renderLabel: formatOrdenLabel
});

export const buildContaModalsViewModel = ({ detalle }) => ({
  tablas: buildTablasModalViewModel({ detalle }),
  notas: buildNotasModalViewModel({ detalle }),
  ordenes: buildOrdenesModalViewModel({ detalle }),
  centrosCosto: {
    isOpen: detalle.centrosCostoModalOpen,
    error: detalle.centrosCostoError,
    loading: detalle.centrosCostoLoading,
    items: detalle.centrosCostoCatalogo,
    targetLineId: detalle.centrosCostoTargetLineId,
    onClose: () => {
      detalle.cerrarSelectorCentrosCosto();
    },
    onSelect: (lineId, centro) => detalle.seleccionarCentroCostoEnLinea(lineId, centro),
  }
});

export const buildContaRetencionViewModel = ({ detalle, totals }) => ({
  canEditContabilizacion: Boolean(detalle.canEditContabilizacion),
  retencionTotal: totals.retencionTotal,
  retencionPendiente: totals.retencionPendiente,
  retencionPagoMonto: detalle.retencionPagoMonto,
  setRetencionPagoMonto: detalle.setRetencionPagoMonto,
  retencionPagoFecha: detalle.retencionPagoFecha,
  setRetencionPagoFecha: detalle.setRetencionPagoFecha,
  retencionPagoNotas: detalle.retencionPagoNotas,
  setRetencionPagoNotas: detalle.setRetencionPagoNotas,
  retencionPagoSaving: detalle.retencionPagoSaving,
  retencionPagoError: detalle.retencionPagoError,
  retencionPagoMessage: detalle.retencionPagoMessage,
  registrarPagoRetencion: detalle.registrarPagoRetencion,
  retencionPagos: detalle.retencionPagos
});
