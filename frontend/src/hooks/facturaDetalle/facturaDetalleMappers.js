import {
  buildContaState,
  buildDocumentosRespaldoActuales,
  buildNotaCreditoActual,
  buildOrdenCompraActual,
  buildTablaPagoActual,
  inferirProveedorDesdeFactura,
  toInputDate
} from './utils.js';

export const mapFacturaDetalleDataToViewState = ({
  facturaData,
  comentariosData,
  estadosData,
  contaData,
  centrosCostoCatalogo,
  proveedoresData,
  now
}) => {
  const proveedorInferido = inferirProveedorDesdeFactura(facturaData, proveedoresData);
  const tablaActual = buildTablaPagoActual(contaData);
  const ordenActual = buildOrdenCompraActual(contaData);
  const notaActual = buildNotaCreditoActual(contaData);
  const documentosRespaldoActuales = buildDocumentosRespaldoActuales(contaData);

  return {
    factura: facturaData,
    comentarios: comentariosData,
    estados: estadosData,
    retencionPagos: Array.isArray(contaData?.retencion_pagos) ? contaData.retencion_pagos : [],
    proveedoresSociedad: proveedoresData,
    centrosCostoCatalogo: Array.isArray(centrosCostoCatalogo) ? centrosCostoCatalogo : [],
    tablaPagoActual: tablaActual,
    ordenCompraActual: ordenActual,
    notaCreditoActual: notaActual,
    documentosRespaldoActuales,
    conta: buildContaState({
      contaData,
      facturaData,
      proveedorInferido,
      notaActual
    }),
    retencionPagoFecha: toInputDate(now)
  };
};
