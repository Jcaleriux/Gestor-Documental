const { FACTURA_ESTADOS } = require('../domain/facturas');
const {
  mapContabilizacionWithPayments,
  ensureFacturaById
} = require('./contabilizacionUseCases.helpers');
const { resolveAssociationContext } = require('./contabilizacionUseCases.associations');

const CONTABILIZACION_WORKFLOW_ACTIONS = Object.freeze({
  SAVE_DRAFT: 'save_draft',
  MARK_IN_REVIEW: 'mark_in_review',
  FINALIZE: 'finalize'
});

const normalizeWorkflowAction = (workflowAction) => (
  workflowAction === CONTABILIZACION_WORKFLOW_ACTIONS.SAVE_DRAFT
  || workflowAction === CONTABILIZACION_WORKFLOW_ACTIONS.MARK_IN_REVIEW
    ? workflowAction
    : CONTABILIZACION_WORKFLOW_ACTIONS.FINALIZE
);

const resolveWorkflowState = (workflowAction) => (
  workflowAction === CONTABILIZACION_WORKFLOW_ACTIONS.FINALIZE
    ? FACTURA_ESTADOS.CONTABILIZADO
    : FACTURA_ESTADOS.EN_REVISION
);

const resolveWorkflowMotivo = (workflowAction) => {
  switch (workflowAction) {
    case CONTABILIZACION_WORKFLOW_ACTIONS.SAVE_DRAFT:
      return 'Borrador de contabilizacion';
    case CONTABILIZACION_WORKFLOW_ACTIONS.MARK_IN_REVIEW:
      return 'Contabilizacion en revision';
    case CONTABILIZACION_WORKFLOW_ACTIONS.FINALIZE:
    default:
      return 'Contabilizacion finalizada';
  }
};

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
    workflow_action,
    metadata,
    usuario
  }) => runInTransaction(async (client) => {
    const factura = await ensureFacturaById({ contabilizacionRepo, facturaId, client });
    const estadoAnterior = factura.estado || null;
    const workflowAction = normalizeWorkflowAction(workflow_action);
    const estadoDestino = resolveWorkflowState(workflowAction);
    const motivoTransicion = resolveWorkflowMotivo(workflowAction);
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
      estado: estadoDestino
    }, client);

    if (estadoAnterior !== estadoDestino) {
      await contabilizacionRepo.insertEstadoDocumento({
        facturaId,
        estadoAnterior,
        estadoNuevo: estadoDestino,
        usuario,
        motivo: motivoTransicion
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

module.exports = {
  createContabilizacionCrudUseCases,
  CONTABILIZACION_WORKFLOW_ACTIONS
};
