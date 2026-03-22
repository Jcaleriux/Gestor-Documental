const FACTURAS_LABELS = {
  pageTitle: 'Facturas',
  pageSubtitle: 'Gestiona y revisa las facturas del sistema',
  searchPlaceholder: 'Buscar documentos...',
  filtersButton: 'Filtros',
  resetFiltersButton: 'Reiniciar filtros',
  exportReportButton: 'Exportar reporte',
  exportingReportButton: 'Generando reporte...',
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
  pageSummary: 'Pagina {page} de {totalPages}',
  totalResults: '{count} resultados',
  actionsButton: 'Acciones',
  primaryActionEdit: 'Contabilizar',
  primaryActionReadOnly: 'Consultar',
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
      en_revision: 'En revision contable',
      en_tramite_pago: 'En tramite de pago',
      pagado_parcialmente: 'Pagado parcialmente',
      en_aprobacion: 'En aprobacion',
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
  pageTitle: 'Notas de credito',
  pageSubtitle: 'Gestiona y revisa las notas de credito de la sociedad seleccionada',
  searchPlaceholder: 'Buscar notas de credito...',
  filtersButton: 'Filtros',
  resetFiltersButton: 'Reiniciar filtros',
  exportReportButton: 'Exportar reporte',
  exportingReportButton: 'Generando reporte...',
  retryButton: 'Reintentar',
  updatingTable: 'Actualizando listado...',
  noSociedad: 'Seleccione una sociedad para ver las notas de credito.',
  loadingErrorTitle: 'No se pudieron cargar las notas de credito.',
  loadingErrorFallback: 'Intente nuevamente en unos segundos.',
  emptyFilters: 'No hay notas de credito para los filtros seleccionados.',
  resultsSummary: 'resultados',
  totalFilteredLabel: 'Monto filtrado',
  saldoDisponibleLabel: 'Saldo disponible',
  statesSummaryTitle: 'Estados',
  currenciesSummaryTitle: 'Monedas',
  pageSizeLabel: 'Filas',
  paginationPrevious: 'Anterior',
  paginationNext: 'Siguiente',
  pageSummary: 'Pagina {page} de {totalPages}',
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
  pageTitle: 'Tiquetes electronicos',
  pageSubtitle: 'Gestiona y revisa los tiquetes electronicos de la sociedad seleccionada',
  searchPlaceholder: 'Buscar tiquetes...',
  filtersButton: 'Filtros',
  resetFiltersButton: 'Reiniciar filtros',
  retryButton: 'Reintentar',
  updatingTable: 'Actualizando listado...',
  noSociedad: 'Seleccione una sociedad para ver los tiquetes electronicos.',
  loadingErrorTitle: 'No se pudieron cargar los tiquetes electronicos.',
  loadingErrorFallback: 'Intente nuevamente en unos segundos.',
  emptyFilters: 'No hay tiquetes electronicos para los filtros seleccionados.',
  resultsSummary: 'resultados',
  totalFilteredLabel: 'Monto filtrado',
  currenciesSummaryTitle: 'Monedas',
  pageSizeLabel: 'Filas',
  paginationPrevious: 'Anterior',
  paginationNext: 'Siguiente',
  pageSummary: 'Pagina {page} de {totalPages}',
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
  pageSubtitle: 'Documentos con retencion pendiente de pago',
  searchPlaceholder: 'Buscar por documento o proveedor...',
  filtersButton: 'Filtros',
  emptyFilters: 'No hay retenciones pendientes para los filtros seleccionados.'
};

const FACTURA_DETALLE_LABELS = {
  header: {
    title: 'Contabilizacion de factura',
    subtitle: 'Completa y revisa los datos contables del documento',
    back: 'Volver a facturas',
    modeReadOnly: 'Solo lectura',
    modeEditable: 'Edicion'
  },
  summary: {
    title: 'Detalles del documento',
    documento: 'Documento',
    consecutivo: 'Consecutivo',
    estado: 'Estado',
    emisor: 'Emisor',
    sociedad: 'Sociedad',
    moneda: 'Moneda',
    fechaEmision: 'Fecha emision',
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
    title: 'Datos de contabilizacion',
    modeHelpReadOnly: 'Este documento esta en modo consulta. Puedes revisar el soporte y el historial, pero no hacer cambios.',
    modeHelpEditable: 'Completa los datos contables y usa las acciones del flujo para dejar el documento en revision o contabilizado.',
    fechasPlazo: 'Fechas y plazo',
    montosAjustes: 'Montos y ajustes',
    clasificacionContable: 'Clasificacion contable',
    relaciones: 'Relaciones',
    totales: 'Totales',
    fechaDocumento: 'Fecha documento',
    fechaVencimiento: 'Fecha vencimiento',
    fechaContabilizacion: 'Fecha contabilizacion',
    plazoCredito: 'Plazo credito (dias)',
    retencion: 'Retencion',
    descuento: 'Descuento',
    anticipoAplicado: 'Anticipo aplicado',
    montoNotaCredito: 'Monto nota de credito',
    totalFactura: 'Total factura',
    rebajosAplicados: 'Descuento + anticipo + nota de credito',
    totalPagoPrincipal: 'Total pago principal',
    retencionPagada: 'Retencion pagada',
    retencionPendiente: 'Retencion pendiente',
    totalPendienteGlobal: 'Pendiente global (incluye retencion)',
    estadoRetencion: 'Estado retencion',
    registrarPagoRetencion: 'Registrar pago de retencion',
    registrandoPagoRetencion: 'Registrando...',
    montoPagoRetencion: 'Monto pago retencion',
    fechaPagoRetencion: 'Fecha pago',
    notasPagoRetencion: 'Notas pago',
    historialRetencion: 'Historial pagos retencion',
    centroCosto: 'Centro de costo',
    centrosCostoDistribucion: 'Distribucion de centros de costo',
    centrosCostoAgregarLinea: 'Agregar otro centro',
    centrosCostoBuscar: 'Buscar centro por codigo o nombre',
    centrosCostoVerTodos: 'Ver todos',
    centrosCostoModalTitle: 'Seleccionar centro de costo',
    centrosCostoTotalObjetivo: 'Total neto a pagar',
    centrosCostoTotalAsignado: 'Distribuido',
    centrosCostoDiferencia: 'Diferencia',
    centrosCostoAprobador: 'Aprobador',
    centrosCostoMonto: 'Monto',
    centrosCostoSinCatalogo: 'No hay centros de costo cargados para esta sociedad.',
    centrosCostoSinResultados: 'No hay centros que coincidan con la busqueda.',
    centrosCostoBudgetPending: 'Por ahora solo seleccionaremos los centros de costo. Los montos por linea y el consumo de presupuesto se habilitaran cuando carguemos presupuestos.',
    centrosCostoHelp: 'Este campo es obligatorio. Cada linea debe quedar asociada a un centro activo antes de continuar.',
    cuentaContable: 'Asiento #',
    proyecto: 'Proyecto',
    ordenCompra: 'Orden de compra',
    notas: 'Observaciones contables',
    notasHelp: 'Usa este campo para registrar observaciones internas de la contabilizacion del documento.',
    notasTooltip: 'Estas observaciones son internas del proceso contable. No sustituyen los comentarios de seguimiento entre usuarios.',
    usuario: 'Usuario',
    saveDraft: 'Guardar borrador',
    saveDraftSaving: 'Guardando borrador...',
    markInReview: 'Marcar en revision',
    markInReviewSaving: 'Marcando en revision...',
    finalize: 'Guardar contabilizacion',
    finalizeSaving: 'Guardando contabilizacion...'
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
  pageTitle: 'Tramites de pago',
  pageSubtitle: 'Revisa y gestiona los tramites de pago',
  searchPlaceholder: 'Buscar por ID o creador...',
  createButton: 'Crear tramite',
  createTitle: 'Nuevo tramite de pago',
  createSubtitle: 'Selecciona facturas y/o retenciones pendientes para incluir en el tramite.',
  createClose: 'Cerrar',
  createMarkAll: 'Marcar todos',
  createClearAll: 'Desmarcar todos',
  createSelectionHelper: 'Aplica a los documentos visibles con los filtros actuales ({count}).',
  createEmptyFilters: 'No hay facturas para los filtros seleccionados.',
  listEmptyFilters: 'No hay tramites para los filtros seleccionados.',
  filters: {
    estadoPlaceholder: 'Todos los estados',
      estados: {
        en_aprobacion_gerencia: 'En aprobacion gerencia',
        en_aprobacion_gerencia_contable: 'En aprobacion gerencia contable',
        en_aprobacion_gerencia_financiera: 'En aprobacion gerencia financiera',
        en_revision_tesoreria: 'En revision tesoreria',
        en_revision_tesoreria_1: 'En revision tesoreria inicial',
        en_revision_tesoreria_2: 'En tesoreria para pago',
        pagado: 'Pagado',
        cancelado: 'Cancelado'
      },
    create: {
      emisor: 'Emisor',
      emisorPlaceholder: 'Buscar por emisor',
      proveedorRetencion: 'Proveedor retencion',
      proveedorRetencionPlaceholder: 'Buscar proveedor de retencion',
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
  tramites: 'Cargando tramites...',
  facturasDisponibles: 'Cargando facturas disponibles...',
  facturas: 'Cargando documentos...',
  notasCredito: 'Cargando notas de credito...',
  tiquetesElectronicos: 'Cargando tiquetes electronicos...',
  retencionesPendientes: 'Cargando retenciones pendientes...',
  tramiteDetalle: 'Cargando tramite...',
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
  FACTURA_DETALLE_LABELS,
  TRAMITES_LABELS,
  TRAMITES_ACTION_LABELS,
  LOADING_LABELS,
  TRAMITE_ALERT_LABELS,
  PROMPT_LABELS
};
