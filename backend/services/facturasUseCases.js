const path = require('path');
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

const FACTURAS_SORT_FIELDS = new Set([
  'fecha_emision',
  'emisor',
  'estado',
  'total_factura',
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
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const FACTURAS_DASHBOARD_PRESETS = new Set([
  'no_contabilizadas',
  'en_revision',
  'en_tramite',
  'por_pagar',
  'vencidas',
  'por_vencer_7',
  'pagadas'
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

const createFacturasUseCases = ({ facturasRepo }) => {
  if (!facturasRepo) {
    throw new Error('facturasRepo requerido');
  }

  const manifestResolver = createFacturasManifestResolver({
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
    getMensajeHacienda,
    getManifest,
    getNotaCreditoManifest,
    listNotasCredito,
    listTiquetesElectronicos,
    listMensajesHacienda
  };
};

module.exports = { createFacturasUseCases };
