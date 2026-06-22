import {
  buildCentroCostoResumen,
  createCentroCostoLinea,
  ensureCentrosCostoMetadata,
} from '../../utils/centrosCosto.js';

const DEFAULT_PLAZO_CREDITO_DIAS = 30;

const ensureEditableCentrosCostoMetadata = (metadata = {}) => {
  const nextMetadata = ensureCentrosCostoMetadata(metadata, { preserveEmpty: true });

  if (!Array.isArray(nextMetadata.centros_costo_lineas) || nextMetadata.centros_costo_lineas.length === 0) {
    nextMetadata.centros_costo_lineas = [createCentroCostoLinea()];
  }

  return nextMetadata;
};

export const createInitialContaState = () => ({
  fecha_documento: '',
  fecha_vencimiento: '',
  fecha_contabilizacion: '',
  plazo_credito: DEFAULT_PLAZO_CREDITO_DIAS,
  retencion: 0,
  retencion_pagada: '',
  estado_retencion: '',
  descuento: 0,
  anticipo_aplicado: 0,
  monto_nota_credito: 0,
  asiento: '',
  centro_costo: '',
  cuenta_contable: '',
  proyecto: '',
  orden_compra: '',
  orden_compra_id: '',
  numero_proveedor: '',
  proveedor_id: '',
  tabla_pago_id: '',
  nota_credito_id: '',
  notas: '',
  metadata: ensureEditableCentrosCostoMetadata(),
});

export const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const addDaysToInputDate = (value, days) => {
  const normalizedDate = toInputDate(value);
  if (!normalizedDate) {
    return '';
  }

  const baseDate = new Date(`${normalizedDate}T00:00:00Z`);
  if (Number.isNaN(baseDate.getTime())) {
    return '';
  }

  baseDate.setUTCDate(baseDate.getUTCDate() + Number(days || 0));
  return baseDate.toISOString().slice(0, 10);
};

export const normalizarIdentificacion = (value) => String(value || '')
  .replace(/[^0-9A-Za-z]/g, '')
  .toUpperCase();

export const toNonNegativeNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

export const getNotaCreditoTotal = (nota) => {
  if (!nota) return null;
  const candidates = [
    nota.monto,
    nota.total_comprobante,
    nota.nota_credito_total_comprobante,
    nota.resumen?.TotalComprobante,
    nota.resumen?.totalComprobante
  ];

  for (const candidate of candidates) {
    const parsed = toNonNegativeNumberOrNull(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

export const inferirProveedorDesdeFactura = (facturaData, proveedores) => {
  if (!facturaData || !Array.isArray(proveedores) || proveedores.length === 0) {
    return null;
  }

  const emisorId = normalizarIdentificacion(
    facturaData.emisor?.Identificacion?.Numero || facturaData.emisor?.identificacion?.numero
  );
  if (!emisorId) {
    return null;
  }

  return proveedores.find((prov) => (
    normalizarIdentificacion(prov.identificacion_numero_normalizado || prov.identificacion_numero) === emisorId
  )) || null;
};

export const buildTablaPagoActual = (contaData) => {
  if (!contaData?.tabla_pago_id) {
    return null;
  }

  return {
    id: contaData.tabla_pago_id,
    nombre: contaData.tabla_pago_nombre || `Tabla #${contaData.tabla_pago_id}`,
    ruta_pdf: contaData.tabla_pago_ruta_pdf || ''
  };
};

export const buildNotaCreditoActual = (contaData) => {
  if (!contaData?.nota_credito_id) {
    return null;
  }

  return {
    id: contaData.nota_credito_id,
    clave: contaData.nota_credito_clave || `Nota #${contaData.nota_credito_id}`,
    ruta_pdf: contaData.nota_credito_ruta_pdf || '',
    ruta_xml: contaData.nota_credito_ruta_xml || '',
    total_comprobante: contaData.nota_credito_total_comprobante ?? null
  };
};

export const buildOrdenCompraActual = (contaData) => {
  if (!contaData?.orden_compra_id) {
    return null;
  }

  return {
    id: contaData.orden_compra_id,
    nombre: contaData.orden_compra_nombre || contaData.orden_compra || `OC #${contaData.orden_compra_id}`,
    ruta_pdf: contaData.orden_compra_ruta_pdf || '',
    estado: contaData.orden_compra_estado || '',
    monto: contaData.orden_compra_monto ?? null,
    moneda: contaData.orden_compra_moneda || ''
  };
};

export const buildDocumentosRespaldoActuales = (contaData) => {
  const items = Array.isArray(contaData?.documentos_respaldo) ? contaData.documentos_respaldo : [];

  return items
    .filter((item) => item && item.id && item.ruta_pdf)
    .map((item) => ({
      id: item.id,
      factura_id: item.factura_id,
      nombre_archivo: item.nombre_archivo || `respaldo_${item.id}.pdf`,
      ruta_pdf: item.ruta_pdf,
      metadata: item.metadata || null,
      creado_por: item.creado_por || '',
      creado_en: item.creado_en || '',
      actualizado_en: item.actualizado_en || ''
    }));
};

export const buildContaState = ({
  contaData = {},
  facturaData = null,
  proveedorInferido = null,
  notaActual = null
}) => {
  const montoNotaInicial = contaData.monto_nota_credito ?? getNotaCreditoTotal(notaActual);
  const metadata = ensureEditableCentrosCostoMetadata(contaData.metadata);
  const centroCostoResumen = buildCentroCostoResumen(metadata.centros_costo_lineas);
  const plazoCredito = contaData.plazo_credito === '' || contaData.plazo_credito == null
    ? DEFAULT_PLAZO_CREDITO_DIAS
    : contaData.plazo_credito;
  const fechaDocumento = toInputDate(contaData.fecha_documento) || toInputDate(facturaData?.fecha_emision);
  const fechaVencimiento = toInputDate(contaData.fecha_vencimiento)
    || addDaysToInputDate(facturaData?.fecha_emision, plazoCredito);

  return {
    fecha_documento: fechaDocumento,
    fecha_vencimiento: fechaVencimiento,
    fecha_contabilizacion: toInputDate(contaData.fecha_contabilizacion) || toInputDate(new Date()),
    plazo_credito: plazoCredito,
    retencion: contaData.retencion ?? 0,
    retencion_pagada: contaData.retencion_pagada ?? '',
    estado_retencion: contaData.estado_retencion ?? '',
    descuento: contaData.descuento ?? 0,
    anticipo_aplicado: contaData.anticipo_aplicado ?? 0,
    monto_nota_credito: montoNotaInicial ?? 0,
    asiento: contaData.asiento ?? '',
    centro_costo: (centroCostoResumen || contaData.centro_costo) ?? '',
    cuenta_contable: contaData.cuenta_contable ?? '',
    proyecto: contaData.proyecto ?? '',
    orden_compra: contaData.orden_compra ?? '',
    orden_compra_id: contaData.orden_compra_id ? String(contaData.orden_compra_id) : '',
    numero_proveedor: contaData.numero_proveedor ?? proveedorInferido?.identificacion_numero ?? '',
    proveedor_id: contaData.proveedor_id
      ? String(contaData.proveedor_id)
      : (proveedorInferido?.id ? String(proveedorInferido.id) : ''),
    tabla_pago_id: contaData.tabla_pago_id ? String(contaData.tabla_pago_id) : '',
    nota_credito_id: contaData.nota_credito_id ? String(contaData.nota_credito_id) : '',
    notas: contaData.notas ?? '',
    metadata,
  };
};
