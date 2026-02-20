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
  total_pendiente_global: toNumberOrNull(row.total_pendiente_global)
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
