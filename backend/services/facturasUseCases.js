const fs = require('fs');
const { assertFound, createError } = require('../utils/errors');
const {
  mapFacturaRow,
  mapRetencionPendienteRow,
  mapNotaCreditoRow,
  mapTiqueteElectronicoRow,
  mapMensajeHaciendaRow
} = require('../mappers/facturasMapper');
const { runtimeConfig } = require('../config/runtime');
const { createFacturasManifestResolver } = require('./facturasManifestResolver');
const { createFilesUseCases } = require('./filesUseCases');
const {
  buildFacturaSidebarData,
  buildOmittedItemsHeader,
  mergeUnifiedPdfResources,
} = require('./tramitesPagoUnifiedPdfSupport');

const FACTURAS_SORT_FIELDS = new Set([
  'fecha_emision',
  'emisor',
  'estado',
  'total_factura',
  'documento',
  'consecutivo',
]);
const NOTAS_CREDITO_SORT_FIELDS = new Set([
  'fecha_emision',
  'emisor',
  'estado',
  'monto',
]);
const TIQUETES_SORT_FIELDS = new Set([
  'fecha_emision',
  'emisor',
  'monto',
]);

const FACTURAS_SORT_DIRS = new Set(['asc', 'desc']);
const DEFAULT_FACTURAS_PAGE = 1;
const DEFAULT_FACTURAS_PAGE_SIZE = 50;
const MAX_FACTURAS_PAGE_SIZE = 200;
const MAX_FACTURAS_PDF_DOWNLOAD_ITEMS = 100;
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FACTURAS_DASHBOARD_PRESETS = new Set([
  'no_contabilizadas',
  'contabilizadas',
  'en_revision',
  'en_tramite',
  'por_pagar',
  'vencidas',
  'por_vencer_7',
  'pagadas',
  'recibidas_ultimo_mes'
]);

const toOptionalPositiveInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }

  return parsed;
};

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const toOptionalNonNegativeNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createError(400, `${fieldName} invalido`);
  }

  return parsed;
};

const toBoundedPositiveInt = (value, fieldName, { defaultValue, max } = {}) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }

  if (Number.isInteger(max) && parsed > max) {
    throw createError(400, `${fieldName} excede el maximo permitido (${max})`);
  }

  return parsed;
};

const normalizeDateInput = (value, fieldName) => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  const match = DATE_INPUT_PATTERN.exec(normalized);
  if (!match) {
    throw createError(400, `${fieldName} invalida`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw createError(400, `${fieldName} invalida`);
  }

  return normalized;
};

const normalizeSortField = (value) => {
  const normalized = normalizeOptionalText(value) || 'fecha_emision';
  if (!FACTURAS_SORT_FIELDS.has(normalized)) {
    throw createError(400, 'sortBy invalido');
  }
  return normalized;
};

const normalizeSortDir = (value) => {
  const normalized = (normalizeOptionalText(value) || 'desc').toLowerCase();
  if (!FACTURAS_SORT_DIRS.has(normalized)) {
    throw createError(400, 'sortDir invalido');
  }
  return normalized;
};

const normalizeDashboardPreset = (value) => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  if (!FACTURAS_DASHBOARD_PRESETS.has(normalized)) {
    throw createError(400, 'dashboardPreset invalido');
  }

  return normalized;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeFacturaIds = (value) => {
  const rawIds = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const ids = rawIds.map((item) => {
    const parsed = Number(item);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw createError(400, 'facturaIds invalidos');
    }
    return parsed;
  });

  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) {
    throw createError(400, 'Seleccione al menos una factura');
  }

  if (uniqueIds.length > MAX_FACTURAS_PDF_DOWNLOAD_ITEMS) {
    throw createError(400, `No se pueden descargar mas de ${MAX_FACTURAS_PDF_DOWNLOAD_ITEMS} facturas a la vez`);
  }

  return uniqueIds;
};

const buildFacturasPdfDownloadFilename = ({ sociedadId }) => {
  const safeSociedadId = String(sociedadId || 'sin_sociedad').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `facturas_${safeSociedadId}_seleccionadas.pdf`;
};

const mapFacturasListSummary = (summary = {}) => ({
  totalItems: toNumber(summary.totalItems, 0),
  totalAmount: toNumber(summary.totalAmount, 0),
  byEstado: Array.isArray(summary.byEstado)
    ? summary.byEstado.map((entry) => ({
      estado: entry.estado || 'no_contabilizado',
      totalItems: toNumber(entry.totalItems, 0),
      totalAmount: toNumber(entry.totalAmount, 0),
    }))
    : [],
  byMoneda: Array.isArray(summary.byMoneda)
    ? summary.byMoneda.map((entry) => ({
      moneda: entry.moneda || 'CRC',
      totalItems: toNumber(entry.totalItems, 0),
      totalAmount: toNumber(entry.totalAmount, 0),
    }))
    : [],
});

const mapNotasCreditoListSummary = (summary = {}) => ({
  totalItems: toNumber(summary.totalItems, 0),
  totalAmount: toNumber(summary.totalAmount, 0),
  totalSaldoDisponible: toNumber(summary.totalSaldoDisponible, 0),
  byEstado: Array.isArray(summary.byEstado)
    ? summary.byEstado.map((entry) => ({
      estado: entry.estado || 'disponible',
      totalItems: toNumber(entry.totalItems, 0),
      totalAmount: toNumber(entry.totalAmount, 0),
      totalSaldoDisponible: toNumber(entry.totalSaldoDisponible, 0),
    }))
    : [],
  byMoneda: Array.isArray(summary.byMoneda)
    ? summary.byMoneda.map((entry) => ({
      moneda: entry.moneda || 'CRC',
      totalItems: toNumber(entry.totalItems, 0),
      totalAmount: toNumber(entry.totalAmount, 0),
      totalSaldoDisponible: toNumber(entry.totalSaldoDisponible, 0),
    }))
    : [],
});

const mapTiquetesListSummary = (summary = {}) => ({
  totalItems: toNumber(summary.totalItems, 0),
  totalAmount: toNumber(summary.totalAmount, 0),
  byMoneda: Array.isArray(summary.byMoneda)
    ? summary.byMoneda.map((entry) => ({
      moneda: entry.moneda || 'CRC',
      totalItems: toNumber(entry.totalItems, 0),
      totalAmount: toNumber(entry.totalAmount, 0),
    }))
    : [],
});

const normalizeFacturasListParams = ({
  sociedadId,
  search,
  estado,
  emisor,
  moneda,
  fechaDesde,
  fechaHasta,
  montoMin,
  montoMax,
  dashboardPreset,
  sortBy,
  sortDir,
  page,
  pageSize,
} = {}) => {
  const normalizedFechaDesde = normalizeDateInput(fechaDesde, 'fechaDesde');
  const normalizedFechaHasta = normalizeDateInput(fechaHasta, 'fechaHasta');
  const normalizedMontoMin = toOptionalNonNegativeNumber(montoMin, 'montoMin');
  const normalizedMontoMax = toOptionalNonNegativeNumber(montoMax, 'montoMax');

  if (
    normalizedFechaDesde
    && normalizedFechaHasta
    && normalizedFechaDesde > normalizedFechaHasta
  ) {
    throw createError(400, 'fechaDesde no puede ser mayor que fechaHasta');
  }

  if (
    normalizedMontoMin !== null
    && normalizedMontoMax !== null
    && normalizedMontoMin > normalizedMontoMax
  ) {
    throw createError(400, 'montoMin no puede ser mayor que montoMax');
  }

  return {
    sociedadId: toOptionalPositiveInt(sociedadId, 'sociedadId'),
    search: normalizeOptionalText(search),
    estado: normalizeOptionalText(estado),
    emisor: normalizeOptionalText(emisor),
    moneda: normalizeOptionalText(moneda)?.toUpperCase() || null,
    fechaDesde: normalizedFechaDesde,
    fechaHasta: normalizedFechaHasta,
    montoMin: normalizedMontoMin,
    montoMax: normalizedMontoMax,
    dashboardPreset: normalizeDashboardPreset(dashboardPreset),
    sortBy: normalizeSortField(sortBy),
    sortDir: normalizeSortDir(sortDir),
    page: toBoundedPositiveInt(page, 'page', { defaultValue: DEFAULT_FACTURAS_PAGE }),
    pageSize: toBoundedPositiveInt(pageSize, 'pageSize', {
      defaultValue: DEFAULT_FACTURAS_PAGE_SIZE,
      max: MAX_FACTURAS_PAGE_SIZE,
    }),
  };
};

const normalizeNotasCreditoSortField = (value) => {
  const normalized = normalizeOptionalText(value) || 'fecha_emision';
  if (!NOTAS_CREDITO_SORT_FIELDS.has(normalized)) {
    throw createError(400, 'sortBy invalido');
  }
  return normalized;
};

const normalizeTiquetesSortField = (value) => {
  const normalized = normalizeOptionalText(value) || 'fecha_emision';
  if (!TIQUETES_SORT_FIELDS.has(normalized)) {
    throw createError(400, 'sortBy invalido');
  }
  return normalized;
};

const normalizeNotasCreditoListParams = ({
  sociedadId,
  proveedorId,
  search,
  estado,
  emisor,
  moneda,
  fechaDesde,
  fechaHasta,
  montoMin,
  montoMax,
  sortBy,
  sortDir,
  page,
  pageSize,
} = {}) => {
  const normalizedFechaDesde = normalizeDateInput(fechaDesde, 'fechaDesde');
  const normalizedFechaHasta = normalizeDateInput(fechaHasta, 'fechaHasta');
  const normalizedMontoMin = toOptionalNonNegativeNumber(montoMin, 'montoMin');
  const normalizedMontoMax = toOptionalNonNegativeNumber(montoMax, 'montoMax');

  if (
    normalizedFechaDesde
    && normalizedFechaHasta
    && normalizedFechaDesde > normalizedFechaHasta
  ) {
    throw createError(400, 'fechaDesde no puede ser mayor que fechaHasta');
  }

  if (
    normalizedMontoMin !== null
    && normalizedMontoMax !== null
    && normalizedMontoMin > normalizedMontoMax
  ) {
    throw createError(400, 'montoMin no puede ser mayor que montoMax');
  }

  return {
    sociedadId: toOptionalPositiveInt(sociedadId, 'sociedadId'),
    proveedorId: toOptionalPositiveInt(proveedorId, 'proveedorId'),
    search: normalizeOptionalText(search),
    estado: normalizeOptionalText(estado)?.toLowerCase() || null,
    emisor: normalizeOptionalText(emisor),
    moneda: normalizeOptionalText(moneda)?.toUpperCase() || null,
    fechaDesde: normalizedFechaDesde,
    fechaHasta: normalizedFechaHasta,
    montoMin: normalizedMontoMin,
    montoMax: normalizedMontoMax,
    sortBy: normalizeNotasCreditoSortField(sortBy),
    sortDir: normalizeSortDir(sortDir),
    page: toBoundedPositiveInt(page, 'page', { defaultValue: DEFAULT_FACTURAS_PAGE }),
    pageSize: toBoundedPositiveInt(pageSize, 'pageSize', {
      defaultValue: DEFAULT_FACTURAS_PAGE_SIZE,
      max: MAX_FACTURAS_PAGE_SIZE,
    }),
  };
};

const normalizeTiquetesListParams = ({
  sociedadId,
  search,
  emisor,
  moneda,
  fechaDesde,
  fechaHasta,
  montoMin,
  montoMax,
  sortBy,
  sortDir,
  page,
  pageSize,
} = {}) => {
  const normalizedFechaDesde = normalizeDateInput(fechaDesde, 'fechaDesde');
  const normalizedFechaHasta = normalizeDateInput(fechaHasta, 'fechaHasta');
  const normalizedMontoMin = toOptionalNonNegativeNumber(montoMin, 'montoMin');
  const normalizedMontoMax = toOptionalNonNegativeNumber(montoMax, 'montoMax');

  if (
    normalizedFechaDesde
    && normalizedFechaHasta
    && normalizedFechaDesde > normalizedFechaHasta
  ) {
    throw createError(400, 'fechaDesde no puede ser mayor que fechaHasta');
  }

  if (
    normalizedMontoMin !== null
    && normalizedMontoMax !== null
    && normalizedMontoMin > normalizedMontoMax
  ) {
    throw createError(400, 'montoMin no puede ser mayor que montoMax');
  }

  return {
    sociedadId: toOptionalPositiveInt(sociedadId, 'sociedadId'),
    search: normalizeOptionalText(search),
    emisor: normalizeOptionalText(emisor),
    moneda: normalizeOptionalText(moneda)?.toUpperCase() || null,
    fechaDesde: normalizedFechaDesde,
    fechaHasta: normalizedFechaHasta,
    montoMin: normalizedMontoMin,
    montoMax: normalizedMontoMax,
    sortBy: normalizeTiquetesSortField(sortBy),
    sortDir: normalizeSortDir(sortDir),
    page: toBoundedPositiveInt(page, 'page', { defaultValue: DEFAULT_FACTURAS_PAGE }),
    pageSize: toBoundedPositiveInt(pageSize, 'pageSize', {
      defaultValue: DEFAULT_FACTURAS_PAGE_SIZE,
      max: MAX_FACTURAS_PAGE_SIZE,
    }),
  };
};

const createFacturasUseCases = ({ facturasRepo, dependencies = {} }) => {
  if (!facturasRepo) {
    throw new Error('facturasRepo requerido');
  }

  const {
    createFilesUseCasesImpl = createFilesUseCases,
    readFileImpl = fs.promises.readFile.bind(fs.promises),
    mergeUnifiedPdfResourcesImpl = mergeUnifiedPdfResources,
    buildOmittedItemsHeaderImpl = buildOmittedItemsHeader,
  } = dependencies;

  const manifestResolver = createFacturasManifestResolver({
    baseDir: runtimeConfig.storageBaseDir
  });
  const filesUseCases = createFilesUseCasesImpl({
    baseDir: runtimeConfig.storageBaseDir
  });

  const listFacturas = async (params) => {
    const normalizedParams = normalizeFacturasListParams(params);
    const result = await facturasRepo.listFacturas(normalizedParams);

    const items = Array.isArray(result?.items)
      ? result.items.map(mapFacturaRow)
      : [];

    const totalItems = toNumber(result?.meta?.totalItems, 0);
    const page = toNumber(result?.meta?.page, normalizedParams.page);
    const pageSize = toNumber(result?.meta?.pageSize, normalizedParams.pageSize);
    const totalPages = toNumber(
      result?.meta?.totalPages,
      totalItems > 0 ? Math.ceil(totalItems / Math.max(pageSize, 1)) : 0
    );

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: Boolean(result?.meta?.hasNext),
        hasPrev: Boolean(result?.meta?.hasPrev),
        sortBy: result?.meta?.sortBy || normalizedParams.sortBy,
        sortDir: result?.meta?.sortDir || normalizedParams.sortDir,
      },
      summary: mapFacturasListSummary(result?.summary),
    };
  };

  const listRetencionesPendientes = async ({ sociedadId }) => {
    const normalizedSociedadId = toOptionalPositiveInt(sociedadId, 'sociedadId');
    const rows = await facturasRepo.listRetencionesPendientes({ sociedadId: normalizedSociedadId });
    return rows.map(mapRetencionPendienteRow);
  };

  const getFactura = async ({ id }) => {
    const row = await facturasRepo.getFacturaById(id);
    assertFound(row, 'Factura not found');
    return mapFacturaRow(row);
  };

  const getFacturasPdfSeleccionadas = async ({ sociedadId, facturaIds }) => {
    const normalizedSociedadId = toOptionalPositiveInt(sociedadId, 'sociedadId');
    if (!normalizedSociedadId) {
      throw createError(400, 'sociedadId requerido');
    }

    const normalizedFacturaIds = normalizeFacturaIds(facturaIds);
    const [sociedad, rows] = await Promise.all([
      typeof facturasRepo.getSociedadById === 'function'
        ? facturasRepo.getSociedadById(normalizedSociedadId)
        : null,
      facturasRepo.listFacturasForPdfDownload({
        ids: normalizedFacturaIds,
        sociedadId: normalizedSociedadId,
      }),
    ]);

    if (!Array.isArray(rows) || rows.length === 0) {
      throw createError(404, 'No se encontraron facturas para descargar.');
    }

    const foundIds = new Set(rows.map((row) => Number(row.id || row.factura_id)));
    const missingIds = normalizedFacturaIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw createError(404, 'Una o mas facturas no existen para la sociedad seleccionada.');
    }

    const resources = rows
      .filter((row) => row?.ruta_pdf)
      .map((row, index) => {
        const facturaId = Number(row.id || row.factura_id);
        const consecutivo = row.consecutivo || row.clave || facturaId;
        return {
          key: `factura-${facturaId}-${index}`,
          path: row.ruta_pdf,
          resourceType: 'factura_pdf',
          sidebarData: buildFacturaSidebarData(row, { society: sociedad }),
          omissionLabel: `Factura ${consecutivo} - PDF factura`,
        };
      });

    if (resources.length === 0) {
      throw createError(404, 'Las facturas seleccionadas no tienen PDF disponible.');
    }

    const { buffer, omittedItems } = await mergeUnifiedPdfResourcesImpl({
      resources,
      loadResourceBuffer: async (resource) => {
        const { fullPath } = filesUseCases.getPdfFile({ rawPath: resource.path });
        return readFileImpl(fullPath);
      },
    });

    if (!buffer) {
      throw createError(404, 'No se encontraron PDFs validos para descargar.');
    }

    return {
      buffer,
      filename: buildFacturasPdfDownloadFilename({ sociedadId: normalizedSociedadId }),
      partialDownload: omittedItems.length > 0,
      omittedCount: omittedItems.length,
      omittedItemsHeader: buildOmittedItemsHeaderImpl(omittedItems),
    };
  };

  const getMensajeHacienda = async ({ id }) => {
    const factura = await facturasRepo.getClaveByFacturaId(id);
    assertFound(factura, 'Factura no encontrada');

    let mensaje = await facturasRepo.getLatestMensajeHaciendaByFacturaId(id);
    if (!mensaje) {
      mensaje = await facturasRepo.getLatestMensajeHaciendaByClave(factura.clave);
    }
    assertFound(mensaje, 'Esta factura aun no tiene Mensaje Hacienda registrado');

    return mensaje;
  };

  const getManifestFor = async ({ getDocument, notFoundMessage, manifestNotFoundMessage }) => {
    const document = await getDocument();
    assertFound(document, notFoundMessage);

    return manifestResolver.readManifestForDocument({
      rutaXml: document.ruta_xml,
      rutaPdf: document.ruta_pdf,
      notFoundMessage: manifestNotFoundMessage
    });
  };

  const getManifest = async ({ id }) => getManifestFor({
    getDocument: () => facturasRepo.getFacturaById(id),
    notFoundMessage: 'Factura no encontrada',
    manifestNotFoundMessage: 'Manifiesto no encontrado para esta factura'
  });

  const getNotaCreditoManifest = async ({ id }) => getManifestFor({
    getDocument: () => facturasRepo.getNotaCreditoById(id),
    notFoundMessage: 'Nota de credito no encontrada',
    manifestNotFoundMessage: 'Manifiesto no encontrado para esta nota de credito'
  });

  const listNotasCredito = async (params) => {
    const normalizedParams = normalizeNotasCreditoListParams(params);
    const result = await facturasRepo.listNotasCredito(normalizedParams);

    const items = Array.isArray(result?.items)
      ? result.items.map(mapNotaCreditoRow)
      : [];

    const totalItems = toNumber(result?.meta?.totalItems, 0);
    const page = toNumber(result?.meta?.page, normalizedParams.page);
    const pageSize = toNumber(result?.meta?.pageSize, normalizedParams.pageSize);
    const totalPages = toNumber(
      result?.meta?.totalPages,
      totalItems > 0 ? Math.ceil(totalItems / Math.max(pageSize, 1)) : 0
    );

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: Boolean(result?.meta?.hasNext),
        hasPrev: Boolean(result?.meta?.hasPrev),
        sortBy: result?.meta?.sortBy || normalizedParams.sortBy,
        sortDir: result?.meta?.sortDir || normalizedParams.sortDir,
      },
      summary: mapNotasCreditoListSummary(result?.summary),
    };
  };

  const listTiquetesElectronicos = async (params) => {
    const normalizedParams = normalizeTiquetesListParams(params);
    const result = await facturasRepo.listTiquetesElectronicos(normalizedParams);

    const items = Array.isArray(result?.items)
      ? result.items.map(mapTiqueteElectronicoRow)
      : [];

    const totalItems = toNumber(result?.meta?.totalItems, 0);
    const page = toNumber(result?.meta?.page, normalizedParams.page);
    const pageSize = toNumber(result?.meta?.pageSize, normalizedParams.pageSize);
    const totalPages = toNumber(
      result?.meta?.totalPages,
      totalItems > 0 ? Math.ceil(totalItems / Math.max(pageSize, 1)) : 0
    );

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: Boolean(result?.meta?.hasNext),
        hasPrev: Boolean(result?.meta?.hasPrev),
        sortBy: result?.meta?.sortBy || normalizedParams.sortBy,
        sortDir: result?.meta?.sortDir || normalizedParams.sortDir,
      },
      summary: mapTiquetesListSummary(result?.summary),
    };
  };

  const listMensajesHacienda = async ({ sociedadId }) => {
    const normalizedSociedadId = toOptionalPositiveInt(sociedadId, 'sociedadId');
    const rows = await facturasRepo.listMensajesHacienda({ sociedadId: normalizedSociedadId });
    return rows.map(mapMensajeHaciendaRow);
  };

  return {
    listFacturas,
    listRetencionesPendientes,
    getFactura,
    getFacturasPdfSeleccionadas,
    getMensajeHacienda,
    getManifest,
    getNotaCreditoManifest,
    listNotasCredito,
    listTiquetesElectronicos,
    listMensajesHacienda
  };
};

module.exports = { createFacturasUseCases };
