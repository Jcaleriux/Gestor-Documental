const { createError } = require('../utils/errors');
const {
  toRequiredPositiveNumber,
  toDateOnlyOrToday,
  ensureFacturaById,
  mapContabilizacionWithPayments
} = require('./contabilizacionUseCases.helpers');

const RETENCION_PAGO_EPSILON = 0.0001;

const assertRetencionPagoValido = ({ montoPago, retencionTotal, retencionPendiente }) => {
  if (retencionTotal <= 0) {
    throw createError(400, 'La factura no tiene retencion configurada');
  }
  if (retencionPendiente <= 0) {
    throw createError(409, 'La retencion ya fue pagada completamente');
  }

  const diferencia = Math.abs(montoPago - retencionPendiente);
  if (diferencia > RETENCION_PAGO_EPSILON) {
    throw createError(
      400,
      `El pago debe ser por el total de la retencion pendiente (${retencionPendiente.toFixed(2)})`
    );
  }
};

const createContabilizacionRetencionUseCases = ({ contabilizacionRepo, runInTransaction }) => {
  const registrarPagoRetencion = async ({
    facturaId,
    monto,
    fecha_pago,
    usuario,
    notas
  }) => {
    const montoPago = toRequiredPositiveNumber(monto, 'monto');
    const fechaPago = toDateOnlyOrToday(fecha_pago);

    return runInTransaction(async (client) => {
      await ensureFacturaById({ contabilizacionRepo, facturaId, client });

      const contabilizacion = await contabilizacionRepo.getContabilizacionRetencionByFacturaIdForUpdate(
        facturaId,
        client
      );
      if (!contabilizacion) {
        throw createError(400, 'La factura no tiene contabilizacion registrada');
      }

      const retencionTotal = Number(contabilizacion.retencion || 0);
      const retencionPagada = Number(contabilizacion.retencion_pagada || 0);
      const retencionPendiente = Math.max(retencionTotal - retencionPagada, 0);

      assertRetencionPagoValido({
        montoPago,
        retencionTotal,
        retencionPendiente
      });

      const pago = await contabilizacionRepo.insertRetencionPago({
        facturaId,
        contabilizacionId: contabilizacion.id,
        monto: montoPago,
        fecha_pago: fechaPago,
        usuario,
        notas
      }, client);

      await contabilizacionRepo.applyRetencionPago({
        facturaId,
        monto: montoPago,
        fecha_pago: fechaPago
      }, client);

      return {
        contabilizacion: await mapContabilizacionWithPayments({
          contabilizacionRepo,
          facturaId,
          client
        }),
        pago
      };
    });
  };

  return { registrarPagoRetencion };
};

module.exports = { createContabilizacionRetencionUseCases };
