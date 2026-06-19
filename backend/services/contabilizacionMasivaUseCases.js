const {
  extractLast11Digits,
  parseDiarioDocumentosFile
} = require('./diarioDocumentosParser');

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const normalizeComparableText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

const getEmisorNombre = (factura) => (
  factura?.emisor?.Nombre
  || factura?.emisor?.nombre
  || ''
);

const getTotalComprobante = (factura) => (
  factura?.resumen?.TotalComprobante
  || factura?.resumen?.totalComprobante
  || null
);

const isProveedorMatch = (factura, proveedorNombre) => {
  const facturaNombre = normalizeComparableText(getEmisorNombre(factura));
  const proveedor = normalizeComparableText(proveedorNombre);

  if (!facturaNombre || !proveedor) {
    return false;
  }

  return facturaNombre.includes(proveedor) || proveedor.includes(facturaNombre);
};

const findUniqueProveedorMatch = (matches, proveedorNombres = []) => {
  const providerMatches = matches.filter((factura) => (
    proveedorNombres.some((proveedorNombre) => isProveedorMatch(factura, proveedorNombre))
  ));

  return providerMatches.length === 1 ? providerMatches[0] : null;
};

const mapFacturaSummary = (factura) => {
  if (!factura) return null;

  return {
    id: factura.id,
    sociedad_id: factura.sociedad_id,
    clave: factura.clave,
    consecutivo: factura.consecutivo,
    factura11: extractLast11Digits(factura.consecutivo),
    fecha_emision: factura.fecha_emision,
    emisor_nombre: getEmisorNombre(factura),
    total_comprobante: getTotalComprobante(factura),
    estado: factura.estado,
    tiene_contabilizacion: Boolean(factura.contabilizacion_id),
    contabilizacion_asiento: factura.contabilizacion_asiento || null,
    contabilizacion_centro_costo: factura.contabilizacion_centro_costo || null
  };
};

const createCentroCostoSnapshot = (centro, { asiento, index, codigo } = {}) => ({
  local_id: `linea-cc-import-${asiento || 'asiento'}-${index + 1}`,
  centro_costo_id: centro?.id != null ? String(centro.id) : '',
  codigo: normalizeCode(centro?.codigo || codigo),
  nombre: String(centro?.nombre || '').trim(),
  usuario_aprobador_id: centro?.usuario_aprobador_id ?? null,
  usuario_aprobador_nombre: String(centro?.usuario_aprobador_nombre || '').trim(),
  usuario_aprobador_email: String(centro?.usuario_aprobador_email || '').trim(),
  rol_aprobador_id: centro?.rol_aprobador_id ?? null,
  rol_aprobador_codigo: String(centro?.rol_aprobador_codigo || '').trim(),
  rol_aprobador_nombre: String(centro?.rol_aprobador_nombre || '').trim(),
  activo: centro?.activo !== false,
  seleccionable_en_contabilizacion: centro?.seleccionable_en_contabilizacion !== false,
  encontrado_en_catalogo: Boolean(centro?.id),
  monto: ''
});

const formatCentroCostoLabel = (linea) => {
  const codigo = normalizeCode(linea?.codigo);
  const nombre = String(linea?.nombre || '').trim();

  if (codigo && nombre) {
    return `${codigo} - ${nombre}`;
  }

  return codigo || nombre || '';
};

const buildCentroCostoResumen = (lineas) => {
  const labels = (Array.isArray(lineas) ? lineas : [])
    .map(formatCentroCostoLabel)
    .filter(Boolean);

  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels[0]} + ${labels.length - 1} mas`;
};

const buildMetadataPreview = ({ item, sociedad, lineas }) => ({
  asiento: item.asiento,
  origen_contabilizacion: 'diario_documentos_csv',
    diario_documentos: {
    sociedad_id: sociedad.id,
    sociedad_codigo: sociedad.codigo,
    sociedad_cedula_juridica: sociedad.cedula_juridica,
      referencia2: item.referencia2,
      factura11: item.factura11,
      proveedor_codigos: item.proveedor_codigos,
      proveedor_nombres: item.proveedor_nombres,
      fecha_contabilizacion: item.fecha_contabilizacion,
      filas: item.filas,
    import_status: 'preview'
  },
  centros_costo_lineas: lineas
});

const createResolutionMap = (resolutions = []) => new Map(
  (Array.isArray(resolutions) ? resolutions : [])
    .filter((resolution) => resolution?.asiento)
    .map((resolution) => [String(resolution.asiento), resolution])
);

const summarizeItems = (items) => items.reduce((summary, item) => {
  summary.total += 1;
  summary[item.status] = (summary[item.status] || 0) + 1;
  if (item.centros_costo_count > 1) {
    summary.multi_centro += 1;
  }
  if (item.centros_costo_invalidos_count > 0) {
    summary.centros_no_resueltos += 1;
  }
  return summary;
}, {
  total: 0,
  ready_new: 0,
  ready_update: 0,
  ready_assigned: 0,
  skipped: 0,
  missing: 0,
  ambiguous: 0,
  invalid_reference: 0,
  invalid_resolution: 0,
  multi_centro: 0,
  centros_no_resueltos: 0
});

const createContabilizacionMasivaUseCases = ({ repo }) => {
  const analyzeDiarioDocumentos = async ({
    sociedadId,
    filePath,
    resolutions = []
  }) => {
    const sociedad = await repo.getSociedadById(sociedadId);
    if (!sociedad) {
      const error = new Error('Sociedad no encontrada');
      error.status = 404;
      throw error;
    }

    const parsed = parseDiarioDocumentosFile(filePath);
    const [facturas, centrosCosto] = await Promise.all([
      repo.listFacturasBySociedad(sociedad.id),
      repo.listCentrosCostoBySociedad(sociedad.id)
    ]);
    const facturasByLast11 = new Map();
    facturas.forEach((factura) => {
      const key = extractLast11Digits(factura.consecutivo);
      if (!key) return;
      if (!facturasByLast11.has(key)) {
        facturasByLast11.set(key, []);
      }
      facturasByLast11.get(key).push(factura);
    });

    const facturasById = new Map(facturas.map((factura) => [Number(factura.id), factura]));
    const centrosByCode = new Map(
      centrosCosto.map((centro) => [normalizeCode(centro.codigo), centro])
    );
    const resolutionMap = createResolutionMap(resolutions);

    const items = parsed.asientos.map((item) => {
      const resolution = resolutionMap.get(item.asiento) || null;
      const lineas = item.centros_costo_codigos
        .map((codigo, index) => createCentroCostoSnapshot(centrosByCode.get(codigo), {
          asiento: item.asiento,
          index,
          codigo
        }));
      const centrosInvalidos = lineas
        .filter((linea) => !linea.centro_costo_id)
        .map((linea) => linea.codigo)
        .filter(Boolean);
      const centroCostoResumen = buildCentroCostoResumen(lineas);
      const base = {
        asiento: item.asiento,
        fecha_contabilizacion: item.fecha_contabilizacion,
        referencia2: item.referencia2,
        factura11: item.factura11,
        proveedor_codigos: item.proveedor_codigos || [],
        proveedor_nombres: item.proveedor_nombres || [],
        filas: item.filas,
        centros_costo_codigos: item.centros_costo_codigos,
        centros_costo_count: item.centros_costo_codigos.length,
        centros_costo_invalidos: centrosInvalidos,
        centros_costo_invalidos_count: centrosInvalidos.length,
        centros_costo_lineas: lineas,
        centro_costo_resumen: centroCostoResumen,
        metadata_preview: buildMetadataPreview({ item, sociedad, lineas }),
        resolution
      };

      if (resolution?.action === 'skip') {
        return {
          ...base,
          status: 'skipped',
          status_label: 'Saltado por usuario',
          factura: null,
          matches: []
        };
      }

      if (resolution?.action === 'assign') {
        const assignedFactura = facturasById.get(Number(resolution.factura_id));
        if (!assignedFactura) {
          return {
            ...base,
            status: 'invalid_resolution',
            status_label: 'Asignacion invalida',
            factura: null,
            matches: []
          };
        }

        return {
          ...base,
          status: assignedFactura.contabilizacion_id ? 'ready_update' : 'ready_assigned',
          status_label: assignedFactura.contabilizacion_id
            ? 'Actualizara contabilizacion existente'
            : 'Listo por asignacion manual',
          factura: mapFacturaSummary(assignedFactura),
          matches: []
        };
      }

      if (!item.factura11) {
        return {
          ...base,
          status: 'invalid_reference',
          status_label: 'Referencia no utilizable',
          factura: null,
          matches: []
        };
      }

      const matches = facturasByLast11.get(item.factura11) || [];
      if (matches.length === 0) {
        return {
          ...base,
          status: 'missing',
          status_label: 'No encontrada',
          factura: null,
          matches: []
        };
      }

      if (matches.length > 1) {
        const proveedorMatch = findUniqueProveedorMatch(matches, item.proveedor_nombres);
        if (proveedorMatch) {
          return {
            ...base,
            status: proveedorMatch.contabilizacion_id ? 'ready_update' : 'ready_new',
            status_label: proveedorMatch.contabilizacion_id ? 'Actualizacion lista' : 'Nueva lista',
            factura: mapFacturaSummary(proveedorMatch),
            matches: matches.map(mapFacturaSummary),
            match_strategy: 'proveedor'
          };
        }

        return {
          ...base,
          status: 'ambiguous',
          status_label: 'Ambigua',
          factura: null,
          matches: matches.map(mapFacturaSummary)
        };
      }

      const factura = matches[0];
      return {
        ...base,
        status: factura.contabilizacion_id ? 'ready_update' : 'ready_new',
        status_label: factura.contabilizacion_id
          ? 'Actualizara contabilizacion existente'
          : 'Lista para contabilizar',
        factura: mapFacturaSummary(factura),
        matches: []
      };
    });

    return {
      source: {
        file_path: parsed.filePath,
        malformed_rows: parsed.malformedRows,
        sociedad
      },
      summary: summarizeItems(items),
      items
    };
  };

  const searchFacturaCandidates = async ({ sociedadId, query, limit }) => {
    const sociedad = await repo.getSociedadById(sociedadId);
    if (!sociedad) {
      const error = new Error('Sociedad no encontrada');
      error.status = 404;
      throw error;
    }

    if (!String(query || '').trim()) {
      return [];
    }

    const facturas = await repo.searchFacturasBySociedad({
      sociedadId: sociedad.id,
      query,
      limit
    });

    return facturas.map(mapFacturaSummary);
  };

  return {
    analyzeDiarioDocumentos,
    searchFacturaCandidates
  };
};

module.exports = {
  buildCentroCostoResumen,
  createContabilizacionMasivaUseCases,
  createCentroCostoSnapshot
};
