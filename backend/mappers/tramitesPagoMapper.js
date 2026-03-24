const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapTramiteRow = (row) => ({
  ...row,
  total_retenciones: toNumberOrNull(row.total_retenciones),
  total_monto_retenciones: toNumberOrNull(row.total_monto_retenciones),
  total_monto_a_pagar: toNumberOrNull(row.total_monto_a_pagar),
  total_monto_retencion_pendiente: toNumberOrNull(row.total_monto_retencion_pendiente),
  total_monto_pendiente_global: toNumberOrNull(row.total_monto_pendiente_global)
});

const mapDocumentoRow = (row) => ({
  ...row,
  monto_pago_programado: toNumberOrNull(row.monto_pago_programado),
  conta_retencion: toNumberOrNull(row.conta_retencion),
  conta_descuento: toNumberOrNull(row.conta_descuento),
  conta_anticipo_aplicado: toNumberOrNull(row.conta_anticipo_aplicado),
  conta_monto_nota_credito: toNumberOrNull(row.conta_monto_nota_credito),
  conta_retencion_total: toNumberOrNull(row.conta_retencion_total),
  conta_retencion_pagada: toNumberOrNull(row.conta_retencion_pagada),
  conta_retencion_pendiente: toNumberOrNull(row.conta_retencion_pendiente),
  total_factura: toNumberOrNull(row.total_factura),
  total_rebajos: toNumberOrNull(row.total_rebajos),
  total_pagado_principal: toNumberOrNull(row.total_pagado_principal),
  total_a_pagar: toNumberOrNull(row.total_a_pagar),
  total_pendiente_global: toNumberOrNull(row.total_pendiente_global),
  conta_metadata: row.conta_metadata && typeof row.conta_metadata === 'object'
    ? row.conta_metadata
    : null,
  conta_documentos_respaldo: Array.isArray(row.conta_documentos_respaldo)
    ? row.conta_documentos_respaldo.map((item) => ({
      ...item,
      id: toNumberOrNull(item?.id) ?? item?.id,
      factura_id: toNumberOrNull(item?.factura_id) ?? item?.factura_id
    }))
    : [],
  gerencia_aprobadores_total: toNumberOrNull(row.gerencia_aprobadores_total) ?? 0,
  gerencia_aprobadores_aprobados: toNumberOrNull(row.gerencia_aprobadores_aprobados) ?? 0,
  gerencia_aprobadores_pendientes: toNumberOrNull(row.gerencia_aprobadores_pendientes) ?? 0,
  gerencia_aprobadores_rechazados: toNumberOrNull(row.gerencia_aprobadores_rechazados) ?? 0,
  gerencia_puede_aprobar_usuario_actual: row.gerencia_puede_aprobar_usuario_actual === true,
  gerencia_ya_aprobo_usuario_actual: row.gerencia_ya_aprobo_usuario_actual === true,
  gerencia_aprobadores: Array.isArray(row.gerencia_aprobadores) ? row.gerencia_aprobadores : []
});

const mapRetencionRow = (row) => ({
  ...row,
  monto_retencion: toNumberOrNull(row.monto_retencion ?? row.monto_retencion_pendiente),
  monto_retencion_pendiente: toNumberOrNull(row.monto_retencion_pendiente ?? row.monto_retencion)
});

const mapHistorialRow = (row) => ({ ...row });

module.exports = {
  mapTramiteRow,
  mapDocumentoRow,
  mapRetencionRow,
  mapHistorialRow
};
