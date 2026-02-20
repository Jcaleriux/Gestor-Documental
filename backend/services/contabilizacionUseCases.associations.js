const { createError } = require('../utils/errors');
const {
  normalizeIdentification,
  toOptionalNonNegativeNumber,
  ensureProveedorById
} = require('./contabilizacionUseCases.helpers');

const resolveTablaPagoSelection = async ({
  contabilizacionRepo,
  sociedadId,
  proveedorId,
  proveedor,
  tablaPagoId,
  client
}) => {
  if (!tablaPagoId) {
    return {
      proveedorId,
      proveedor,
      tablaPagoId
    };
  }

  const tablaPago = await contabilizacionRepo.getTablaPagoById(tablaPagoId, client);
  if (!tablaPago || Number(tablaPago.sociedad_id) !== sociedadId) {
    throw createError(400, 'Tabla de pago invalida para la sociedad de la factura');
  }

  if (proveedorId && Number(tablaPago.proveedor_id) !== proveedorId) {
    throw createError(400, 'La tabla de pago no corresponde al proveedor seleccionado');
  }

  if (!proveedorId) {
    const resolvedProveedorId = Number(tablaPago.proveedor_id);
    const resolvedProveedor = await ensureProveedorById({
      contabilizacionRepo,
      proveedorId: resolvedProveedorId,
      sociedadId,
      client
    });

    return {
      proveedorId: resolvedProveedorId,
      proveedor: resolvedProveedor,
      tablaPagoId
    };
  }

  return {
    proveedorId,
    proveedor,
    tablaPagoId
  };
};

const resolveNotaCreditoSelection = async ({
  contabilizacionRepo,
  sociedadId,
  proveedorId,
  proveedor,
  notaCreditoId,
  montoNotaCredito,
  client
}) => {
  if (!notaCreditoId) {
    return {
      proveedorId,
      proveedor,
      notaCreditoId,
      montoNotaCredito
    };
  }

  const notaCredito = await contabilizacionRepo.getNotaCreditoById(notaCreditoId, client);
  if (!notaCredito || Number(notaCredito.sociedad_id) !== sociedadId) {
    throw createError(400, 'Nota de credito invalida para la sociedad de la factura');
  }

  const notaTotal = Number(notaCredito.total_comprobante || 0);
  let montoNotaCreditoFinal = montoNotaCredito;
  if (montoNotaCreditoFinal === null && Number.isFinite(notaTotal) && notaTotal >= 0) {
    montoNotaCreditoFinal = notaTotal;
  }

  const notaEmisorNormalizado = normalizeIdentification(notaCredito.emisor_identificacion_numero);
  if (!notaEmisorNormalizado) {
    throw createError(400, 'No se pudo validar el emisor de la nota de credito');
  }

  let proveedorIdFinal = proveedorId;
  let proveedorFinal = proveedor;

  if (proveedorIdFinal) {
    if (!proveedorFinal) {
      proveedorFinal = await ensureProveedorById({
        contabilizacionRepo,
        proveedorId: proveedorIdFinal,
        sociedadId,
        client
      });
    }

    const proveedorNormalizado = normalizeIdentification(proveedorFinal.identificacion_numero);
    if (!proveedorNormalizado || proveedorNormalizado !== notaEmisorNormalizado) {
      throw createError(400, 'La nota de credito no corresponde al proveedor seleccionado');
    }
  } else {
    proveedorFinal = await contabilizacionRepo.getProveedorBySociedadAndIdentificacion({
      sociedadId,
      identificacionNumeroNormalizado: notaEmisorNormalizado
    }, client);

    if (!proveedorFinal) {
      throw createError(400, 'La nota de credito no corresponde a un proveedor registrado de esta sociedad');
    }

    proveedorIdFinal = Number(proveedorFinal.id);
  }

  return {
    proveedorId: proveedorIdFinal,
    proveedor: proveedorFinal,
    notaCreditoId,
    montoNotaCredito: montoNotaCreditoFinal
  };
};

const resolveAssociationContext = async ({ contabilizacionRepo, factura, input, client }) => {
  const sociedadId = Number(factura.sociedad_id);
  let proveedorId = input.proveedor_id ? Number(input.proveedor_id) : null;
  const tablaPagoId = input.tabla_pago_id ? Number(input.tabla_pago_id) : null;
  const notaCreditoId = input.nota_credito_id ? Number(input.nota_credito_id) : null;
  let montoNotaCredito = toOptionalNonNegativeNumber(input.monto_nota_credito, 'monto_nota_credito');
  let numeroProveedorFinal = input.numero_proveedor || null;

  let proveedor = null;
  if (proveedorId) {
    proveedor = await ensureProveedorById({
      contabilizacionRepo,
      proveedorId,
      sociedadId,
      client
    });
  }

  const tablaResolution = await resolveTablaPagoSelection({
    contabilizacionRepo,
    sociedadId,
    proveedorId,
    proveedor,
    tablaPagoId,
    client
  });
  proveedorId = tablaResolution.proveedorId;
  proveedor = tablaResolution.proveedor;

  const notaResolution = await resolveNotaCreditoSelection({
    contabilizacionRepo,
    sociedadId,
    proveedorId,
    proveedor,
    notaCreditoId,
    montoNotaCredito,
    client
  });
  proveedorId = notaResolution.proveedorId;
  proveedor = notaResolution.proveedor;
  montoNotaCredito = notaResolution.montoNotaCredito;

  if (proveedor && !numeroProveedorFinal) {
    numeroProveedorFinal = proveedor.identificacion_numero || null;
  }

  return {
    proveedorId,
    tablaPagoId,
    notaCreditoId,
    montoNotaCredito,
    numeroProveedorFinal
  };
};

module.exports = { resolveAssociationContext };
