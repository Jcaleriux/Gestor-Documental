const { FACTURA_ESTADOS } = require('../domain/facturas');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveEstadoRetencion = (row) => {
  const pendiente = toNumber(row.retencion_pendiente, 0);
  const pagada = toNumber(row.retencion_pagada, 0);

  if (pendiente <= 0) return 'pagada';
  if (pagada > 0) return 'parcial';
  return 'pendiente';
};

const mapFacturaRow = (row) => ({
  id: row.id,
  clave: row.clave.toString(),
  consecutivo: row.consecutivo,
  numero_consecutivo: row.numero_consecutivo,
  fecha_emision: row.fecha_emision,
  creado_en: row.creado_en,
  emisor: row.emisor,
  receptor: row.receptor,
  resumen: row.resumen,
  xml_completo: row.xml_completo,
  ruta_xml: row.ruta_xml,
  ruta_pdf: row.ruta_pdf,
  estado: row.estado || FACTURA_ESTADOS.NO_CONTABILIZADO,
  estado_documental: row.estado_documental || row.estado || FACTURA_ESTADOS.NO_CONTABILIZADO,
  estado_workflow_pago: row.estado_workflow_pago || null,
  sociedad_id: row.sociedad_id || null,
  total_factura: toNumber(
    row.total_factura ?? row.resumen?.TotalComprobante,
    0
  ),
  total_rebajos: toNumber(row.total_rebajos, 0),
  retencion_total: toNumber(row.retencion_total, 0),
  retencion_pagada: toNumber(row.retencion_pagada, 0),
  retencion_pendiente: toNumber(row.retencion_pendiente, 0),
  total_a_pagar: toNumber(
    row.total_a_pagar ?? row.resumen?.TotalComprobante,
    0
  ),
  total_pendiente_global: toNumber(
    row.total_pendiente_global ?? row.total_a_pagar ?? row.resumen?.TotalComprobante,
    0
  ),
  has_mensaje_hacienda: typeof row.has_mensaje_hacienda === 'boolean'
    ? row.has_mensaje_hacienda
    : null,
  estado_hacienda: row.estado_hacienda || null,
  mensaje_hacienda: row.mensaje_hacienda === undefined || row.mensaje_hacienda === null
    ? null
    : Number(row.mensaje_hacienda)
});

const mapRetencionPendienteRow = (row) => ({
  id: row.id,
  clave: row.clave?.toString?.() || row.clave,
  consecutivo: row.consecutivo,
  numero_consecutivo: row.numero_consecutivo,
  fecha_emision: row.fecha_emision,
  emisor: row.emisor,
  receptor: row.receptor,
  resumen: row.resumen,
  ruta_xml: row.ruta_xml,
  ruta_pdf: row.ruta_pdf,
  estado: row.estado || FACTURA_ESTADOS.NO_CONTABILIZADO,
  estado_documental: row.estado_documental || row.estado || FACTURA_ESTADOS.NO_CONTABILIZADO,
  estado_workflow_pago: row.estado_workflow_pago || null,
  sociedad_id: row.sociedad_id || null,
  total_factura: toNumber(row.total_factura ?? row.resumen?.TotalComprobante, 0),
  total_rebajos: toNumber(row.total_rebajos, 0),
  retencion_total: toNumber(row.retencion_total, 0),
  retencion_pagada: toNumber(row.retencion_pagada, 0),
  retencion_pendiente: toNumber(row.retencion_pendiente, 0),
  total_a_pagar: toNumber(row.total_a_pagar ?? row.resumen?.TotalComprobante, 0),
  total_pendiente_global: toNumber(row.total_pendiente_global ?? row.total_a_pagar, 0),
  estado_retencion: resolveEstadoRetencion(row),
  fecha_ultimo_pago_retencion: row.fecha_ultimo_pago_retencion || null,
  proveedor_id: row.proveedor_id || null,
  proveedor_nombre: row.proveedor_nombre || null,
  proveedor_identificacion: row.proveedor_identificacion || null,
  retencion_en_tramite_activo: Boolean(row.retencion_en_tramite_activo)
});

const mapNotaCreditoRow = (row) => ({
  id: row.id,
  clave: row.clave,
  numero_consecutivo: row.numero_consecutivo
    || row.xml_completo?.NumeroConsecutivo
    || null,
  fecha_emision: row.fecha_emision,
  emisor: row.emisor || row.xml_completo?.Emisor || null,
  receptor: row.receptor || row.xml_completo?.Receptor || null,
  resumen: row.resumen
    || row.xml_completo?.ResumenFactura
    || row.xml_completo?.ResumenNotaCredito
    || null,
  monto: Number(
    row.monto_total
    || row.monto
    || row.xml_completo?.ResumenFactura?.TotalComprobante
    || row.xml_completo?.ResumenNotaCredito?.TotalComprobante
    || 0
  ),
  monto_total: toNumber(
    row.monto_total
    || row.monto
    || row.xml_completo?.ResumenFactura?.TotalComprobante
    || row.xml_completo?.ResumenNotaCredito?.TotalComprobante
    || 0,
    0
  ),
  total_aplicado: toNumber(row.total_aplicado, 0),
  saldo_disponible: toNumber(row.saldo_disponible, 0),
  xml_completo: row.xml_completo,
  ruta_xml: row.ruta_xml,
  ruta_pdf: row.ruta_pdf,
  moneda: row.moneda || null,
  estado: row.estado || 'disponible',
  sociedad_id: row.sociedad_id || null
});

const mapTiqueteElectronicoRow = (row) => ({
  id: row.id,
  clave: row.clave,
  consecutivo: row.consecutivo,
  numero_consecutivo: row.consecutivo,
  fecha_emision: row.fecha_emision,
  creado_en: row.creado_en,
  emisor: row.emisor,
  receptor: row.receptor,
  resumen: row.resumen,
  xml_completo: row.xml_completo,
  monto_total: toNumber(
    row.monto_total ?? row.resumen?.TotalComprobante ?? row.resumen?.totalComprobante,
    0
  ),
  moneda: row.moneda || null,
  ruta_xml: row.ruta_xml,
  ruta_pdf: row.ruta_pdf,
  sociedad_id: row.sociedad_id || null
});

const mapMensajeHaciendaRow = (row) => ({
  id: row.id,
  clave: row.clave,
  mensaje: row.mensaje,
  estado: row.estado,
  detalle: row.detalle,
  ruta_xml: row.ruta_xml,
  creado_en: row.creado_en,
  sociedad_id: row.sociedad_id,
  factura_id: row.factura_id
});

module.exports = {
  mapFacturaRow,
  mapRetencionPendienteRow,
  mapNotaCreditoRow,
  mapTiqueteElectronicoRow,
  mapMensajeHaciendaRow
};
