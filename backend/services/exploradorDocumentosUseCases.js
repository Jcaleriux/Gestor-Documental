const { createError } = require('../utils/errors');
const { resolveSociedadAccessScope } = require('./sociedadAccessService');

const MAX_PAGE_SIZE = 100;
const ALLOWED_CURRENCIES = new Set(['CRC', 'USD']);

const toPositiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
};

const cleanText = (value, maxLength = 120) => String(value || '').trim().slice(0, maxLength);

const normalizeDate = (value, fieldName) => {
  if (!value) return '';
  const normalized = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createError(400, `${fieldName} invalida`);
  }
  const [year, month, day] = normalized.split('-').map(Number);
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

const mapDocumento = (row) => ({
  id: row.id,
  clave: row.clave,
  consecutivo: row.consecutivo,
  fechaEmision: row.fecha_emision,
  creadoEn: row.creado_en,
  proveedorNombre: row.proveedor_nombre,
  proveedorIdentificacion: row.proveedor_identificacion,
  moneda: row.moneda || 'CRC',
  estado: row.estado,
  total: Number(row.total || 0),
  totalAPagar: Number(row.total_a_pagar || 0),
  retencionPendiente: Number(row.retencion_pendiente || 0),
  pendienteGlobal: Number(row.pendiente_global || 0),
  tieneXml: Boolean(row.ruta_xml),
  tienePdf: Boolean(row.ruta_pdf),
  contabilizacion: {
    fechaDocumento: row.fecha_documento,
    fechaVencimiento: row.fecha_vencimiento,
    fechaContabilizacion: row.fecha_contabilizacion,
    centroCosto: row.centro_costo,
    cuentaContable: row.cuenta_contable,
    proyecto: row.proyecto,
    ordenCompra: row.orden_compra,
    notas: row.notas,
    centrosCostoLineas: Array.isArray(row.metadata?.centros_costo_lineas)
      ? row.metadata.centros_costo_lineas
      : []
  },
  tramite: row.tramite_id ? {
    id: row.tramite_id,
    estado: row.tramite_estado,
    estadoTesoreria: row.estado_tesoreria,
    estadoGerencia: row.estado_gerencia,
    estadoGerenciaContable: row.estado_gerencia_contable,
    estadoFinanciero: row.estado_financiero
  } : null
});

const normalizeResumen = (row = {}) => ({
  totalDocumentos: Number(row.total_documentos || 0),
  totalesPorMoneda: (row.totales_por_moneda || []).map((item) => ({
    moneda: item.moneda || 'CRC',
    documentos: Number(item.documentos || 0),
    total: Number(item.total || 0),
    pendiente: Number(item.pendiente || 0)
  })),
  serieMensual: (row.serie_mensual || []).map((item) => ({
    mes: item.mes,
    moneda: item.moneda || 'CRC',
    documentos: Number(item.documentos || 0),
    total: Number(item.total || 0)
  })),
  estados: (row.estados || []).map((item) => ({
    estado: item.estado,
    documentos: Number(item.documentos || 0)
  })),
  topProveedores: (row.top_proveedores || []).map((item) => ({
    ...item,
    documentos: Number(item.documentos || 0),
    monto: Number(item.monto || 0)
  }))
});

const createExploradorDocumentosUseCases = ({ exploradorRepo }) => ({
  async explorar({ query = {}, user }) {
    const scope = await resolveSociedadAccessScope({
      user,
      sociedadId: query.sociedadId,
      fieldName: 'sociedadId'
    });
    const page = toPositiveInt(query.page, 1);
    const pageSize = toPositiveInt(query.pageSize, 25, MAX_PAGE_SIZE);
    const moneda = cleanText(query.moneda, 3).toUpperCase();
    if (moneda && !ALLOWED_CURRENCIES.has(moneda)) {
      throw createError(400, 'moneda invalida');
    }
    const filters = {
      busqueda: cleanText(query.busqueda),
      proveedor: cleanText(query.proveedor),
      centroCosto: cleanText(query.centroCosto),
      estado: cleanText(query.estado, 50),
      moneda,
      fechaDesde: normalizeDate(query.fechaDesde, 'fechaDesde'),
      fechaHasta: normalizeDate(query.fechaHasta, 'fechaHasta')
    };
    if (filters.fechaDesde && filters.fechaHasta && filters.fechaDesde > filters.fechaHasta) {
      throw createError(400, 'El rango de fechas es invalido');
    }

    const repositoryScope = { ...scope, filters };
    const [resumenRow, rows] = await Promise.all([
      exploradorRepo.getResumen(repositoryScope),
      exploradorRepo.listDocumentos({ ...repositoryScope, page, pageSize })
    ]);
    const resumen = normalizeResumen(resumenRow);
    const totalItems = resumen.totalDocumentos;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      resumen,
      documentos: rows.map(mapDocumento),
      paginacion: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages
      }
    };
  }
});

module.exports = { createExploradorDocumentosUseCases };
