const FACTURAS_LABELS = {
  pageTitle: 'Facturas',
  pageSubtitle: 'Gestiona y revisa las facturas del sistema',
  searchPlaceholder: 'Buscar documentos...',
  filtersButton: 'Filtros',
  resetFiltersButton: 'Reiniciar filtros',
  exportReportButton: 'Exportar reporte',
  exportingReportButton: 'Generando reporte...',
  downloadSelectedPdfButton: 'Descargar PDF',
  downloadingSelectedPdfButton: 'Descargando PDF...',
  markVisibleButton: 'Marcar visibles',
  clearSelectionButton: 'Desmarcar todos',
  selectedSummary: '{count} facturas marcadas',
  retryButton: 'Reintentar',
  updatingTable: 'Actualizando listado...',
  noSociedad: 'Seleccione una sociedad para ver los documentos.',
  loadingErrorTitle: 'No se pudieron cargar las facturas.',
  loadingErrorFallback: 'Intente nuevamente en unos segundos.',
  emptyFilters: 'No hay documentos para los filtros seleccionados.',
  resultsSummary: 'resultados',
  totalFilteredLabel: 'Monto filtrado',
  statesSummaryTitle: 'Estados',
  currenciesSummaryTitle: 'Monedas',
  pageSizeLabel: 'Filas',
  paginationPrevious: 'Anterior',
  paginationNext: 'Siguiente',
  pageSummary: 'Página {page} de {totalPages}',
  totalResults: '{count} resultados',
  actionsButton: 'Acciones',
  primaryActionEdit: 'Contabilizar',
  primaryActionReadOnly: 'Consultar',
  columns: {
    documento: 'Documento',
    emisor: 'Emisor',
    fecha: 'Fecha',
    total: 'Total',
    hacienda: 'Hacienda',
    estado: 'Estado',
    acciones: 'Acciones'
  },
  actionsMenu: {
    openPdf: 'Abrir PDF',
    openXml: 'Abrir XML',
    viewMh: 'Ver MH',
    viewManifest: 'Ver manifiesto',
    unavailable: 'No disponible'
  },
  filters: {
    estado: 'Estado',
    estadoOptions: {
      all: 'Todos',
      no_contabilizado: 'No contabilizado',
      contabilizado: 'Contabilizado',
      en_revision: 'En revisión contable',
      en_tramite_pago: 'En trámite de pago',
      pagado_parcialmente: 'Pagado parcialmente',
      en_aprobacion: 'En aprobación',
      rechazado: 'Rechazado',
      pagado: 'Pagado'
    },
    emisor: 'Emisor',
    emisorPlaceholder: 'Nombre del emisor',
    moneda: 'Moneda',
    monedaOptions: {
      all: 'Todas',
      CRC: 'CRC',
      USD: 'USD'
    },
    desde: 'Desde',
    hasta: 'Hasta',
    montoMin: 'Monto min',
    montoMinPlaceholder: '0',
    montoMax: 'Monto max',
    montoMaxPlaceholder: '0'
  }
};

const NOTAS_CREDITO_LABELS = {
  pageTitle: 'Notas de crédito',
  pageSubtitle: 'Gestiona y revisa las notas de crédito de la sociedad seleccionada',
  searchPlaceholder: 'Buscar notas de crédito...',
  filtersButton: 'Filtros',
  resetFiltersButton: 'Reiniciar filtros',
  exportReportButton: 'Exportar reporte',
  exportingReportButton: 'Generando reporte...',
  retryButton: 'Reintentar',
  updatingTable: 'Actualizando listado...',
  noSociedad: 'Seleccione una sociedad para ver las notas de crédito.',
  loadingErrorTitle: 'No se pudieron cargar las notas de crédito.',
  loadingErrorFallback: 'Intente nuevamente en unos segundos.',
  emptyFilters: 'No hay notas de crédito para los filtros seleccionados.',
  resultsSummary: 'resultados',
  totalFilteredLabel: 'Monto filtrado',
  saldoDisponibleLabel: 'Saldo disponible',
  statesSummaryTitle: 'Estados',
  currenciesSummaryTitle: 'Monedas',
  pageSizeLabel: 'Filas',
  paginationPrevious: 'Anterior',
  paginationNext: 'Siguiente',
  pageSummary: 'Página {page} de {totalPages}',
  totalResults: '{count} resultados',
  actionsButton: 'Acciones',
  primaryAction: 'Abrir PDF',
  columns: {
    documento: 'Documento',
    emisor: 'Emisor',
    fecha: 'Fecha',
    total: 'Total',
    estado: 'Estado',
    acciones: 'Acciones'
  },
  actionsMenu: {
    openPdf: 'Abrir PDF',
    openXml: 'Abrir XML',
    viewManifest: 'Ver manifiesto',
    unavailable: 'No disponible'
  },
  filters: {
    estado: 'Estado',
    estadoOptions: {
      all: 'Todos',
      disponible: 'Disponible',
      aplicada: 'Aplicada'
    },
    emisor: 'Emisor',
    emisorPlaceholder: 'Nombre del emisor',
    moneda: 'Moneda',
    monedaOptions: {
      all: 'Todas',
      CRC: 'CRC',
      USD: 'USD'
    },
    desde: 'Desde',
    hasta: 'Hasta',
    montoMin: 'Monto min',
    montoMinPlaceholder: '0',
    montoMax: 'Monto max',
    montoMaxPlaceholder: '0'
  },
  saldoHint: 'Saldo disponible: {moneda} {monto}'
};

const TIQUETES_ELECTRONICOS_LABELS = {
  pageTitle: 'Tiquetes electrónicos',
  pageSubtitle: 'Gestiona y revisa los tiquetes electrónicos de la sociedad seleccionada',
  searchPlaceholder: 'Buscar tiquetes...',
  filtersButton: 'Filtros',
  resetFiltersButton: 'Reiniciar filtros',
  retryButton: 'Reintentar',
  updatingTable: 'Actualizando listado...',
  noSociedad: 'Seleccione una sociedad para ver los tiquetes electrónicos.',
  loadingErrorTitle: 'No se pudieron cargar los tiquetes electrónicos.',
  loadingErrorFallback: 'Intente nuevamente en unos segundos.',
  emptyFilters: 'No hay tiquetes electrónicos para los filtros seleccionados.',
  resultsSummary: 'resultados',
  totalFilteredLabel: 'Monto filtrado',
  currenciesSummaryTitle: 'Monedas',
  pageSizeLabel: 'Filas',
  paginationPrevious: 'Anterior',
  paginationNext: 'Siguiente',
  pageSummary: 'Página {page} de {totalPages}',
  totalResults: '{count} resultados',
  actionsButton: 'Acciones',
  primaryAction: 'Abrir PDF',
  columns: {
    documento: 'Documento',
    emisor: 'Emisor',
    fecha: 'Fecha',
    total: 'Total',
    acciones: 'Acciones'
  },
  actionsMenu: {
    openXml: 'Abrir XML',
    unavailable: 'No disponible'
  },
  filters: {
    emisor: 'Emisor',
    emisorPlaceholder: 'Nombre del emisor',
    moneda: 'Moneda',
    monedaOptions: {
      all: 'Todas',
      CRC: 'CRC',
      USD: 'USD'
    },
    desde: 'Desde',
    hasta: 'Hasta',
    montoMin: 'Monto min',
    montoMinPlaceholder: '0',
    montoMax: 'Monto max',
    montoMaxPlaceholder: '0'
  }
};

const RETENCIONES_PENDIENTES_LABELS = {
  pageTitle: 'Retenciones pendientes',
  pageSubtitle: 'Documentos con retención pendiente de pago',
  searchPlaceholder: 'Buscar por documento o proveedor...',
  filtersButton: 'Filtros',
  emptyFilters: 'No hay retenciones pendientes para los filtros seleccionados.'
};

const PDFS_PENDIENTES_LABELS = {
  pageTitle: 'PDFs pendientes',
  pageSubtitle: 'Resuelve PDFs que quedaron sin asociacion confiable durante la importacion',
  refreshButton: 'Actualizar',
  searchPlaceholder: 'Buscar factura por clave, consecutivo, emisor o receptor',
  searchButton: 'Buscar',
  searchingButton: 'Buscando...',
  assignButton: 'Asociar PDF',
  assigningButton: 'Asociando...',
  openPdfButton: 'Abrir PDF',
  overwriteLabel: 'Reemplazar ruta PDF actual',
  noSociedad: 'Seleccione una sociedad para buscar facturas destino.',
  loading: 'Cargando PDFs pendientes...',
  empty: 'No hay PDFs pendientes.',
  noSelection: 'Seleccione un PDF pendiente.',
  readyToSearch: 'Busque la factura destino para este PDF.',
  noCandidates: 'No hay facturas para la busqueda indicada.',
  canDoTitle: 'Puedes',
  cannotDoTitle: 'No puedes',
  canDoText: 'Abrir el PDF, seleccionar una factura de esta sociedad y asociarlo.',
  cannotDoText: 'Asociar sin elegir factura destino o mezclar sociedades.',
  selectedCandidate: 'Factura destino seleccionada',
  success: 'PDF asociado correctamente.',
  columns: {
    lote: 'Lote',
    pdf: 'PDF',
    motivo: 'Motivo',
    acciones: 'Acciones',
    documento: 'Documento',
    emisor: 'Emisor',
    receptor: 'Receptor',
    fecha: 'Fecha',
    estado: 'Estado'
  }
};

const FACTURA_DETALLE_LABELS = {
  header: {
    title: 'Contabilización de factura',
    subtitle: 'Completa y revisa los datos contables del documento',
    back: 'Volver a facturas',
    modeReadOnly: 'Solo lectura',
    modeEditable: 'Edición'
  },
  summary: {
    title: 'Detalles del documento',
    documento: 'Documento',
    consecutivo: 'Consecutivo',
    estado: 'Estado',
    emisor: 'Emisor',
    sociedad: 'Sociedad',
    moneda: 'Moneda',
    fechaEmision: 'Fecha emisión',
    total: 'Total'
  },
  pdf: {
    title: 'Documento de referencia',
    pdfOpenTab: 'Abrir PDF',
    pdfOpenTabUnavailable: 'PDF no disponible',
    xmlAvailable: 'Abrir XML',
    xmlUnavailable: 'XML no disponible',
    mhButton: 'Ver MH',
    mhUnavailable: 'MH no disponible',
    manifestButton: 'Ver manifiesto',
    manifestUnavailable: 'Manifiesto no disponible',
    mhLoading: 'Cargando...',
    pdfUnavailable: 'PDF no disponible.'
  },
  contabilizacion: {
    title: 'Datos de contabilización',
    modeHelpReadOnly: 'Este documento está en modo consulta. Puedes revisar el soporte y el historial, pero no hacer cambios.',
    modeHelpEditable: 'Completa los datos contables y usa las acciones del flujo para dejar el documento en revisión o contabilizado.',
    fechasPlazo: 'Fechas y plazo',
    montosAjustes: 'Montos y ajustes',
    clasificacionContable: 'Clasificación contable',
    relaciones: 'Relaciones',
    totales: 'Totales',
    fechaDocumento: 'Fecha documento',
    fechaVencimiento: 'Fecha vencimiento',
    fechaContabilizacion: 'Fecha contabilización',
    plazoCredito: 'Plazo crédito (días)',
    retencion: 'Retención',
    descuento: 'Descuento',
    anticipoAplicado: 'Anticipo aplicado',
    montoNotaCredito: 'Monto nota de crédito',
    totalFactura: 'Total factura',
    rebajosAplicados: 'Descuento + anticipo + nota de crédito',
    totalPagoPrincipal: 'Total pago principal',
    retencionPagada: 'Retención pagada',
    retencionPendiente: 'Retención pendiente',
    totalPendienteGlobal: 'Pendiente global (incluye retención)',
    estadoRetencion: 'Estado retención',
    registrarPagoRetencion: 'Registrar pago de retención',
    registrandoPagoRetencion: 'Registrando...',
    montoPagoRetencion: 'Monto pago retención',
    fechaPagoRetencion: 'Fecha pago',
    notasPagoRetencion: 'Notas pago',
    historialRetencion: 'Historial pagos retención',
    centroCosto: 'Centro de costo',
    centrosCostoDistribucion: 'Distribución de centros de costo',
    centrosCostoAgregarLinea: 'Agregar otro centro',
    centrosCostoBuscar: 'Buscar centro por código o nombre',
    centrosCostoVerTodos: 'Ver todos',
    centrosCostoModalTitle: 'Seleccionar centro de costo',
    centrosCostoTotalObjetivo: 'Total neto a pagar',
    centrosCostoTotalAsignado: 'Distribuido',
    centrosCostoDiferencia: 'Diferencia',
    centrosCostoAprobador: 'Aprobador',
    centrosCostoMonto: 'Monto',
    centrosCostoSinCatalogo: 'No hay centros de costo cargados para esta sociedad.',
    centrosCostoSinResultados: 'No hay centros que coincidan con la búsqueda.',
    centrosCostoBudgetPending: 'Por ahora solo seleccionaremos los centros de costo. Los montos por línea y el consumo de presupuesto se habilitarán cuando carguemos presupuestos.',
    centrosCostoHelp: 'Este campo es obligatorio. Cada línea debe quedar asociada a un centro activo antes de continuar.',
    asiento: 'Asiento #',
    cuentaContable: 'Cuenta contable',
    proyecto: 'Proyecto',
    ordenCompra: 'Orden de compra',
    notas: 'Observaciones contables',
    notasHelp: 'Usa este campo para registrar observaciones internas de la contabilización del documento.',
    notasTooltip: 'Estas observaciones son internas del proceso contable. No sustituyen los comentarios de seguimiento entre usuarios.',
    usuario: 'Usuario',
    saveDraft: 'Guardar borrador',
    saveDraftSaving: 'Guardando borrador...',
    markInReview: 'Marcar en revisión',
    markInReviewSaving: 'Marcando en revisión...',
    finalize: 'Guardar contabilización',
    finalizeSaving: 'Guardando contabilización...'
  },
  cambiarEstado: {
    title: 'Cambiar estado',
    usuarioPlaceholder: 'Usuario',
    seleccionarEstado: 'Seleccionar estado',
    motivoPlaceholder: 'Motivo (opcional)',
    submit: 'Guardar estado'
  },
  historial: {
    title: 'Trazabilidad del documento',
    empty: 'Sin trazabilidad registrada.'
  },
  comentarios: {
    title: 'Comentarios',
    usuarioPlaceholder: 'Usuario',
    comentarioPlaceholder: 'Escribe un comentario',
    submit: 'Agregar comentario',
    empty: 'Sin comentarios.'
  }
};

const TRAMITES_ACTION_LABELS = {
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  reenviar: 'Reenviar',
  excluir: 'Excluir',
  devolverContabilidad: 'Devolver a contabilidad',
  reincluir: 'Reincluir',
  destinoPlaceholder: 'Destino...',
  ver: 'Ver'
};

const TRAMITES_LABELS = {
  pageTitle: 'Trámites de pago',
  pageSubtitle: 'Revisa y gestiona los trámites de pago',
  searchPlaceholder: 'Buscar por ID o creador...',
  openCreateButton: 'Nuevo trámite',
  createButton: 'Crear trámite',
  createTitle: 'Nuevo trámite de pago',
  createSubtitle: 'Selecciona facturas y/o retenciones pendientes para incluir en el trámite.',
  createClose: 'Cerrar',
  createMarkAll: 'Marcar todos',
  createClearAll: 'Desmarcar todos',
  createSelectionHelper: 'Aplica a los documentos visibles con los filtros actuales ({count}).',
  createEmptyFilters: 'No hay facturas para los filtros seleccionados.',
  listEmptyFilters: 'No hay trámites para los filtros seleccionados.',
  filters: {
    estadoPlaceholder: 'Todos los estados',
      estados: {
        en_aprobacion_gerencia: 'En aprobación gerencia',
        en_aprobacion_gerencia_contable: 'En aprobación gerencia contable',
        en_aprobacion_gerencia_financiera: 'En aprobación gerencia financiera',
        en_revision_tesoreria: 'En revisión tesorería',
        en_revision_tesoreria_1: 'En revisión tesorería inicial',
        en_revision_tesoreria_2: 'En tesorería para pago',
        pagado: 'Pagado',
        cancelado: 'Cancelado'
      },
    create: {
      emisor: 'Emisor',
      emisorPlaceholder: 'Buscar por emisor',
      proveedorRetencion: 'Proveedor retención',
      proveedorRetencionPlaceholder: 'Buscar proveedor de retención',
      montoMin: 'Monto min',
      montoMinPlaceholder: '0',
      montoMax: 'Monto max',
      montoMaxPlaceholder: '0',
      moneda: 'Moneda',
      monedaAll: 'Todas'
    }
  }
};

const LOADING_LABELS = {
  tramites: 'Cargando trámites...',
  facturasDisponibles: 'Cargando facturas disponibles...',
  facturas: 'Cargando documentos...',
  notasCredito: 'Cargando notas de crédito...',
  tiquetesElectronicos: 'Cargando tiquetes electrónicos...',
  retencionesPendientes: 'Cargando retenciones pendientes...',
  tramiteDetalle: 'Cargando trámite...',
  facturaDetalle: 'Cargando detalle...',
  dashboard: 'Cargando dashboard...',
  usuarios: 'Cargando usuarios...',
  proveedores: 'Cargando proveedores...'
};

const TRAMITE_ALERT_LABELS = {
  decisionSuccess: 'Decision registrada.',
  estadoSuccess: 'Estado del tramite actualizado.',
  tesoreriaSuccess: 'Accion de tesoreria registrada.',
  caratulasUploadSuccess: 'Caratulas cargadas y procesadas.',
  caratulasResolveSuccess: 'Resolucion de caratulas guardada.',
  decisionError: 'No se pudo registrar la decision.',
  estadoError: 'No se pudo cambiar el estado.',
  tesoreriaError: 'No se pudo registrar la accion.',
  caratulasUploadError: 'No se pudieron cargar las caratulas.',
  caratulasResolveError: 'No se pudo guardar la resolucion de caratulas.',
  tesoreriaDestinoRequired: 'Selecciona un destino para continuar.',
  tesoreriaMotivoRequired: 'Debes indicar un motivo para devolver el documento a contabilidad.',
  caratulasFileRequired: 'Selecciona un PDF de caratulas para continuar.'
};

const PROMPT_LABELS = {
  rechazoMotivo: 'Motivo del rechazo',
  exclusionMotivo: 'Motivo de exclusion',
  devolucionContabilidadMotivo: 'Motivo de devolucion a contabilidad',
  motivoOpcional: 'Motivo (opcional)'
};

export {
  FACTURAS_LABELS,
  NOTAS_CREDITO_LABELS,
  TIQUETES_ELECTRONICOS_LABELS,
  RETENCIONES_PENDIENTES_LABELS,
  PDFS_PENDIENTES_LABELS,
  FACTURA_DETALLE_LABELS,
  TRAMITES_LABELS,
  TRAMITES_ACTION_LABELS,
  LOADING_LABELS,
  TRAMITE_ALERT_LABELS,
  PROMPT_LABELS
};
