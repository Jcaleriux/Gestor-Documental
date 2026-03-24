const TRAMITE_LABELS = {
  pageTitle: 'Tramite',
  pageSubtitle: 'Detalle y decisiones del tramite de pago',
  tabs: {
    individual: 'Documentos individuales',
    unificada: 'Vista unificada'
  },
  headerActions: {
    back: 'Volver',
    exportReport: 'Exportar reporte',
    exportingReport: 'Generando reporte...',
    toggleHistory: {
      show: 'Ver historial',
      hide: 'Ocultar historial'
    }
  },
  override: {
    title: 'Override de estado (admin)',
    user: 'Usuario',
    estado: 'Estado',
    motivo: 'Motivo',
    motivoPlaceholder: 'Motivo obligatorio',
    submit: 'Actualizar estado',
    select: 'Selecciona',
    required: 'Estado y motivo son requeridos.'
  },
  unificada: {
    title: 'Vista unificada',
    documentosActivos: 'Documentos activos',
    total: 'Total',
    sociedad: 'Sociedad',
    downloadUnifiedPdf: 'Descargar PDF',
    downloadingUnifiedPdf: 'Generando PDF...',
    expandAllPdfs: 'Expandir todos los PDFs',
    collapseAllPdfs: 'Ocultar todos los PDFs'
  },
  caratulas: {
    title: 'Caratulas por proveedor',
    subtitle: 'Sube un PDF y revisa la asignacion automatica por proveedor y factura.',
    uploadTitle: 'PDF fuente del tramite',
    uploadHint: 'Solo se permite un archivo PDF por tramite. Si vuelves a subirlo, reemplaza la version anterior.',
    uploadButton: 'Subir caratulas',
    replaceButton: 'Reemplazar caratulas',
    uploading: 'Procesando PDF...',
    noFile: 'No hay caratulas cargadas para este tramite.',
    waitingGerencia: 'Las caratulas se habilitan cuando Gerencia apruebe todos los documentos activos del tramite.',
    waitingGerenciaReady: 'Gerencia ya aprobo todos los documentos. El tramite debe pasar a revision inicial de Tesoreria para cargar caratulas.',
    waitingSummary: 'Aprobados por Gerencia',
    waitingPending: 'Pendientes',
    waitingRejected: 'Rechazados',
    waitingPendingDocs: 'Documentos pendientes',
    noGroups: 'No hay grupos de proveedores detectados.',
    warningsTitle: 'Advertencias detectadas',
    providerTitle: 'Proveedor',
    linesTitle: 'Lineas detectadas',
    noLines: 'No hay lineas de caratula para este proveedor.',
    documentsTitle: 'Facturas del proveedor',
    resolveButton: 'Guardar resolucion',
    resolving: 'Guardando...',
    providerSelect: 'Selecciona el proveedor del tramite',
    lineSelect: 'Selecciona factura',
    pdfUnavailable: 'No hay vista previa disponible para esta caratula.',
    fileInputHelp: 'Archivo PDF',
    unresolvedBadge: 'Requiere revision',
    resolvedBadge: 'Resuelto',
    pendingCaratulaBadge: 'Caratula pendiente',
    providerAttachmentPending: 'Caratula pendiente',
    providerAttachmentConfirmed: 'Caratula confirmada',
    orderPending: 'Orden pendiente',
    orderConfirmed: 'Orden confirmado',
    orderNotRequired: 'Orden no requerido',
    orderTitle: 'Orden de facturas',
    orderHint: 'Arrastra las facturas para reflejar el orden de la caratula antes de confirmar.',
    confirmOrderButton: 'Confirmar orden',
    attachProviderButton: 'Adjuntar caratula',
    replaceProviderButton: 'Sustituir caratula',
    confirmProviderButton: 'Confirmar caratula',
    providerAttachmentActions: 'Archivo del proveedor',
    providerAttachmentMissingHint: 'Este proveedor aun no tiene una caratula adjunta.',
    providerAttachmentReplaceHint: 'Sustituye la caratula si la asignacion automatica no es correcta.',
    orphansTitle: 'Caratulas huerfanas',
    assignOrphanButton: 'Adjuntar a proveedor',
    discardOrphanButton: 'Desechar',
    orphanAssignLabel: 'Proveedor sin caratula',
    viewPdfButton: 'Ver PDF',
    providerSortButton: 'Orden proveedor',
    executionDate: 'Fecha de ejecucion',
    pages: 'Paginas',
    strategy: 'Match proveedor',
    sourceFile: 'Archivo'
  },
  historial: {
    title: 'Historial del tramite',
    empty: 'Sin historial.'
  },
  documentos: {
    empty: 'No hay documentos asociados al tramite.',
    emptyActivos: 'No hay documentos activos en el tramite.'
  }
};

export default TRAMITE_LABELS;
