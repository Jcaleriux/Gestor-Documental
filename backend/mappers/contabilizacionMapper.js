const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapRetencionPagoRow = (row) => ({
  ...row,
  monto: toNumberOrNull(row.monto)
});

const mapContabilizacionRow = (row) => {
  if (!row) return null;

  return {
    ...row,
    retencion: toNumberOrNull(row.retencion),
    descuento: toNumberOrNull(row.descuento),
    anticipo_aplicado: toNumberOrNull(row.anticipo_aplicado),
    monto_nota_credito: toNumberOrNull(row.monto_nota_credito),
    orden_compra_monto: toNumberOrNull(row.orden_compra_monto),
    retencion_pagada: toNumberOrNull(row.retencion_pagada),
    retencion_pendiente: toNumberOrNull(row.retencion_pendiente),
    nota_credito_total_comprobante: toNumberOrNull(row.nota_credito_total_comprobante),
    retencion_pagos: Array.isArray(row.retencion_pagos)
      ? row.retencion_pagos.map(mapRetencionPagoRow)
      : []
  };
};

module.exports = {
  mapContabilizacionRow
};
