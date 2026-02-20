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

    const associationContext = await resolveAssociationContext({
      contabilizacionRepo,
      factura,
      input: {
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
      orden_compra,
      numero_proveedor: associationContext.numeroProveedorFinal,
      proveedor_id: associationContext.proveedorId,
      tabla_pago_id: associationContext.tablaPagoId,
      nota_credito_id: associationContext.notaCreditoId,
      notas,
      metadata,
      usuario
    }, client);

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
