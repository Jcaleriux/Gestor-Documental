const { FACTURA_ESTADOS } = require('../domain/facturas');
const {
  mapContabilizacionWithPayments,
  ensureFacturaById
} = require('./contabilizacionUseCases.helpers');
const { resolveAssociationContext } = require('./contabilizacionUseCases.associations');

const createContabilizacionCrudUseCases = ({ contabilizacionRepo, runInTransaction }) => {
  const getContabilizacion = async ({ facturaId }) => mapContabilizacionWithPayments({
    contabilizacionRepo,
    facturaId,
    client: null
  });

  const upsertContabilizacion = async ({
    facturaId,
    fecha_documento,
    fecha_vencimiento,
    fecha_contabilizacion,
    plazo_credito,
    retencion,
    descuento,
    anticipo_aplicado,
    monto_nota_credito,
    centro_costo,
    cuenta_contable,
    proyecto,
    orden_compra,
    orden_compra_id,
    numero_proveedor,
    proveedor_id,
    tabla_pago_id,
    nota_credito_id,
    notas,
    metadata,
    usuario
  }) => runInTransaction(async (client) => {
    const factura = await ensureFacturaById({ contabilizacionRepo, facturaId, client });
    const estadoAnterior = factura.estado || null;
    const existingContabilizacion = await contabilizacionRepo.getContabilizacionByFacturaId(facturaId, client);

    const associationContext = await resolveAssociationContext({
      contabilizacionRepo,
      factura,
      existingContabilizacion,
      input: {
        orden_compra,
        orden_compra_id,
        proveedor_id,
        tabla_pago_id,
        nota_credito_id,
        monto_nota_credito,
        numero_proveedor
      },
      client
    });

    await contabilizacionRepo.upsertContabilizacion({
      facturaId,
      fecha_documento,
      fecha_vencimiento,
      fecha_contabilizacion,
      plazo_credito,
      retencion,
      descuento,
      anticipo_aplicado,
      monto_nota_credito: associationContext.montoNotaCredito,
      centro_costo,
      cuenta_contable,
      proyecto,
      orden_compra: associationContext.ordenCompraTextoFinal,
      orden_compra_id: associationContext.ordenCompraId,
      numero_proveedor: associationContext.numeroProveedorFinal,
      proveedor_id: associationContext.proveedorId,
      tabla_pago_id: associationContext.tablaPagoId,
      nota_credito_id: associationContext.notaCreditoId,
      notas,
      metadata,
      usuario
    }, client);

    const ordenesAfectadas = new Set(
      [
        existingContabilizacion?.orden_compra_id,
        associationContext.ordenCompraId
      ]
        .filter((value) => value != null && value !== '')
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    );

    for (const ordenCompraIdAfectada of ordenesAfectadas) {
      await contabilizacionRepo.refreshEstadoOrdenCompraById(ordenCompraIdAfectada, client);
    }

    await contabilizacionRepo.normalizeRetencionStateByFacturaId(facturaId, client);

    await contabilizacionRepo.updateFacturaEstado({
      facturaId,
      estado: FACTURA_ESTADOS.CONTABILIZADO
    }, client);

    if (estadoAnterior !== FACTURA_ESTADOS.CONTABILIZADO) {
      await contabilizacionRepo.insertEstadoDocumento({
        facturaId,
        estadoAnterior,
        estadoNuevo: FACTURA_ESTADOS.CONTABILIZADO,
        usuario,
        motivo: 'Contabilizacion'
      }, client);
    }

    return mapContabilizacionWithPayments({
      contabilizacionRepo,
      facturaId,
      client
    });
  });

  return {
    getContabilizacion,
    upsertContabilizacion
  };
};

module.exports = { createContabilizacionCrudUseCases };
