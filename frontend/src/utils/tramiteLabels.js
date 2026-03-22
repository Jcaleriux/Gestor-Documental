const TRAMITE_LABELS = {
  pageTitle: 'Tramite',
  pageSubtitle: 'Detalle y decisiones del tramite de pago',
  tabs: {
    individual: 'Documentos individuales',
    unificada: 'Vista unificada'
  },
  headerActions: {
    back: 'Volver',
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
    sociedad: 'Sociedad'
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
    noGroups: 'No hay grupos de proveedores detectados.',
    warningsTitle: 'Advertencias detectadas',
    providerTitle: 'Proveedor',
    linesTitle: 'Lineas detectadas',
    documentsTitle: 'Facturas del proveedor',
    resolveButton: 'Guardar resolucion',
    resolving: 'Guardando...',
    providerSelect: 'Selecciona el proveedor del tramite',
    lineSelect: 'Selecciona factura',
    pdfUnavailable: 'No hay vista previa disponible para esta caratula.',
    fileInputHelp: 'Archivo PDF',
    unresolvedBadge: 'Requiere revision',
    resolvedBadge: 'Resuelto',
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
