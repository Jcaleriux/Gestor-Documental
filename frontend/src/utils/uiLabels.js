const FACTURAS_LABELS = {
  pageTitle: 'Facturas',
  pageSubtitle: 'Gestiona y revisa las facturas del sistema',
  searchPlaceholder: 'Buscar documentos...',
  filtersButton: 'Filtros',
  resetFiltersButton: 'Reiniciar filtros',
  exportReportButton: 'Exportar reporte',
  exportingReportButton: 'Generando reporte...',
  emptyFilters: 'No hay documentos para los filtros seleccionados.',
  filters: {
    estado: 'Estado',
    estadoOptions: {
      all: 'Todos',
      no_contabilizado: 'No contabilizado',
      contabilizado: 'Contabilizado',
      en_revision: 'En revision',
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

const RETENCIONES_PENDIENTES_LABELS = {
  pageTitle: 'Retenciones pendientes',
  pageSubtitle: 'Documentos con retencion pendiente de pago',
  searchPlaceholder: 'Buscar por documento o proveedor...',
  filtersButton: 'Filtros',
  emptyFilters: 'No hay retenciones pendientes para los filtros seleccionados.'
};

const FACTURA_DETALLE_LABELS = {
  header: {
    title: 'Documento',
    subtitle: 'Detalle del documento',
    back: 'Volver a documentos'
  },
  summary: {
    title: 'Resumen del documento',
    consecutivo: 'Consecutivo',
    estado: 'Estado',
    emisor: 'Emisor',
    receptor: 'Receptor',
    fechaEmision: 'Fecha emision',
    total: 'Total'
  },
  pdf: {
    title: 'Vista PDF',
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
    title: 'Contabilizacion',
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
    cuentaContable: 'Cuenta contable',
    proyecto: 'Proyecto',
    ordenCompra: 'Orden de compra',
    numeroProveedor: 'Numero proveedor',
    notas: 'Notas',
    usuario: 'Usuario',
    submit: 'Contabilizar',
    saving: 'Guardando...'
  },
  cambiarEstado: {
    title: 'Cambiar estado',
    usuarioPlaceholder: 'Usuario',
    seleccionarEstado: 'Seleccionar estado',
    motivoPlaceholder: 'Motivo (opcional)',
    submit: 'Guardar estado'
  },
  historial: {
    title: 'Historial de estados',
    empty: 'Sin historial.'
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
  createEmptyFilters: 'No hay facturas para los filtros seleccionados.',
  listEmptyFilters: 'No hay tramites para los filtros seleccionados.',
  filters: {
    estadoPlaceholder: 'Todos los estados',
    estados: {
      en_aprobacion_gerencia: 'En aprobacion gerencia',
      en_aprobacion_gerencia_contable: 'En aprobacion gerencia contable',
      en_aprobacion_gerencia_financiera: 'En aprobacion gerencia financiera',
      en_revision_tesoreria: 'En revision tesoreria',
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
  decisionError: 'No se pudo registrar la decision.',
  estadoError: 'No se pudo cambiar el estado.',
  tesoreriaError: 'No se pudo registrar la accion.',
  tesoreriaDestinoRequired: 'Selecciona un destino para continuar.'
};

const PROMPT_LABELS = {
  rechazoMotivo: 'Motivo del rechazo',
  exclusionMotivo: 'Motivo de exclusion',
  motivoOpcional: 'Motivo (opcional)'
};

export {
  FACTURAS_LABELS,
  RETENCIONES_PENDIENTES_LABELS,
  FACTURA_DETALLE_LABELS,
  TRAMITES_LABELS,
  TRAMITES_ACTION_LABELS,
  LOADING_LABELS,
  TRAMITE_ALERT_LABELS,
  PROMPT_LABELS
};
