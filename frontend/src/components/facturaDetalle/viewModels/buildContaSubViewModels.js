const formatOrdenLabel = (orden) => (
  `${orden.nombre} | ${orden.moneda || '-'} ${Number(orden.monto_disponible || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
);

export const buildContaFormViewModel = ({ detalle }) => ({
  conta: detalle.conta,
  proveedoresSociedad: detalle.proveedoresSociedad,
  contaSaving: detalle.contaSaving,
  contaMessage: detalle.contaMessage,
  contaError: detalle.contaError,
  handleContaChange: detalle.handleContaChange,
  guardarContabilizacion: detalle.guardarContabilizacion
});

export const buildContaAssociationsViewModel = ({ detalle }) => ({
  tablasLoading: detalle.tablasLoading,
  ordenesLoading: detalle.ordenesLoading,
  notasLoading: detalle.notasLoading,
  tablaPagoActual: detalle.tablaPagoActual,
  ordenCompraActual: detalle.ordenCompraActual,
  notaCreditoActual: detalle.notaCreditoActual,
  abrirAsociarTablaPago: detalle.abrirAsociarTablaPago,
  abrirAsociarOrdenCompra: detalle.abrirAsociarOrdenCompra,
  abrirAsociarNotaCredito: detalle.abrirAsociarNotaCredito,
  verTablaPagoAsociada: detalle.verTablaPagoAsociada,
  verOrdenCompraAsociada: detalle.verOrdenCompraAsociada,
  verNotaCreditoAsociada: detalle.verNotaCreditoAsociada
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
  ordenes: buildOrdenesModalViewModel({ detalle })
});

export const buildContaRetencionViewModel = ({ detalle, totals }) => ({
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
