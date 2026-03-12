import { withAuthToken } from '../../../utils/auth.js';

export const toNonNegativeNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

export const buildFileUrl = ({ endpoint, ruta }) => (
  ruta
    ? withAuthToken(`${endpoint}?path=${encodeURIComponent(ruta)}`)
    : ''
);

export const buildMonedaFactura = (factura) => (
  factura.resumen?.CodigoTipoMoneda?.CodigoMoneda
  || factura.resumen?.CodigoMoneda
  || factura.resumen?.codigoMoneda
  || 'CRC'
);

export const buildContabilizacionTotals = ({ factura, conta }) => {
  const totalFactura = toNonNegativeNumber(factura.resumen?.TotalComprobante);
  const rebajosAplicados = toNonNegativeNumber(conta.descuento)
    + toNonNegativeNumber(conta.anticipo_aplicado)
    + toNonNegativeNumber(conta.monto_nota_credito);
  const retencionTotal = toNonNegativeNumber(conta.retencion);
  const totalPagoPrincipal = Math.max(totalFactura - rebajosAplicados - retencionTotal, 0);
  const retencionPagada = toNonNegativeNumber(conta.retencion_pagada);
  const retencionPendiente = Math.max(retencionTotal - retencionPagada, 0);
  const totalPendienteGlobal = totalPagoPrincipal + retencionPendiente;

  return {
    totalFactura,
    rebajosAplicados,
    retencionTotal,
    totalPagoPrincipal,
    retencionPagada,
    retencionPendiente,
    totalPendienteGlobal
  };
};
