const {
  normalizeEstado,
  validateDecisionDocumentoInput,
  validateCambioEstadoInput,
  validateTransicion
} = require('./tramitesPagoRules');
const { TRAMITE_ACCIONES } = require('../domain/tramitesPago');
const { createError, assertFound, throwIfValidationError } = require('../utils/errors');
const {
  normalizeUniquePositiveIds,
  parsePositiveIntOrThrow,
  toNormalizedLowerString
} = require('./tramitesPagoUseCases.helpers');
const {
  createCambioEstadoPolicies,
  resolveCambioEstadoPolicy
} = require('./tramitesPagoWorkflowStatePolicies');
const {
  createDecisionDocumentoPolicies,
  resolveDecisionDocumentoPolicy
} = require('./tramitesPagoWorkflowDecisionPolicies');
const { resolveEtapaDecisionPolicy } = require('./tramitesPagoWorkflowEtapaPolicies');
const { createTramiteWithPolicies } = require('./tramitesPagoWorkflowCreatePolicies');

const createTramitesPagoWorkflowUseCases = ({ tramitesPagoRepo, runInTransaction, policyRegistry }) => {
  const cambioEstadoPolicies = createCambioEstadoPolicies({ tramitesPagoRepo });
  const decisionDocumentoPolicies = createDecisionDocumentoPolicies({ tramitesPagoRepo });
  const resolveCreateItemPolicy = policyRegistry?.workflow?.resolveCreateItemPolicy;
  const resolveEstadoPolicy = policyRegistry?.workflow?.resolveEstadoPolicy
    || ((estadoDestino) => resolveCambioEstadoPolicy({
      policies: cambioEstadoPolicies,
      estadoDestino
    }));
  const resolveEtapaPolicy = policyRegistry?.workflow?.resolveEtapaPolicy || resolveEtapaDecisionPolicy;
  const resolveDecisionPolicy = policyRegistry?.workflow?.resolveDecisionPolicy
    || (({ decision, etapa }) => resolveDecisionDocumentoPolicy({
      policies: decisionDocumentoPolicies,
      decision,
      etapa
    }));

  const crearTramite = async ({ sociedad_id, factura_ids, retencion_factura_ids, usuario }) => {
    const facturaIds = normalizeUniquePositiveIds(factura_ids);
    const retencionFacturaIds = normalizeUniquePositiveIds(retencion_factura_ids);

    if (facturaIds.length === 0 && retencionFacturaIds.length === 0) {
      throw createError(400, 'Seleccione al menos una factura o una retencion');
    }

    return runInTransaction(async (client) => {
      const sociedadInput = sociedad_id !== undefined && sociedad_id !== null && sociedad_id !== ''
        ? Number(sociedad_id)
        : null;

      return createTramiteWithPolicies({
        tramitesPagoRepo,
        itemEntries: [
          { type: 'facturas', ids: facturaIds },
          { type: 'retenciones', ids: retencionFacturaIds }
        ].filter((entry) => entry.ids.length > 0),
        resolveItemPolicy: resolveCreateItemPolicy,
        sociedadInput,
        usuario,
        client
      });
    });
  };

  const cambiarEstado = async ({ id, estado, usuario, motivo, force, pagos_documentos }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const estadoNormalizadoInput = toNormalizedLowerString(estado);
    const estadoCheck = validateCambioEstadoInput(estadoNormalizadoInput, force, motivo);
    throwIfValidationError(estadoCheck);
    const { estadoNormalizado } = estadoCheck;
    const estadoPolicy = resolveEstadoPolicy(estadoNormalizado);

    return runInTransaction(async (client) => {
      const tramite = await tramitesPagoRepo.getTramiteById(tramiteId, client);
      assertFound(tramite, 'Tramite no encontrado');

      const actualRaw = tramite.estado;
      const actual = normalizeEstado(actualRaw);
      const sameNormalized = actual === estadoNormalizado;
      if (sameNormalized && actualRaw === estadoNormalizado) {
        return tramite;
      }

      if (!sameNormalized) {
        throwIfValidationError(validateTransicion(actual, estadoNormalizado, force));
      }

      await estadoPolicy.validateBeforeUpdate({
        tramiteId,
        sameNormalized,
        client
      });

      const updateRes = await tramitesPagoRepo.updateTramiteEstado({
        tramiteId,
        estado: estadoNormalizado
      }, client);

      await tramitesPagoRepo.insertHistorialConEstados({
        tramiteId,
        accion: force ? TRAMITE_ACCIONES.OVERRIDE_ESTADO : TRAMITE_ACCIONES.CAMBIAR_ESTADO,
        estadoAnterior: actualRaw,
        estadoNuevo: estadoNormalizado,
        usuario,
        motivo
      }, client);

      await estadoPolicy.runAfterUpdate({
        tramiteId,
        usuario,
        pagosDocumentos: pagos_documentos,
        client
      });

      return updateRes;
    });
  };

  const decisionDocumento = async ({ id, facturaId, etapa, decision, motivo, usuario }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const normalizedFacturaId = parsePositiveIntOrThrow(facturaId, 'facturaId');
    const etapaNormalizada = toNormalizedLowerString(etapa);
    const decisionNormalizada = toNormalizedLowerString(decision);

    throwIfValidationError(validateDecisionDocumentoInput(etapaNormalizada, decisionNormalizada));

    const etapaPolicy = resolveEtapaPolicy(etapaNormalizada);
    if (!etapaPolicy) {
      throwIfValidationError({ status: 400, error: 'etapa invalida' });
    }

    const columnas = etapaPolicy.columnas;
    const decisionPolicy = resolveDecisionPolicy({
      decision: decisionNormalizada,
      etapa: etapaNormalizada
    });

    return runInTransaction(async (client) => {
      const result = await tramitesPagoRepo.updateDocumentoDecision({
        tramiteId,
        facturaId: normalizedFacturaId,
        columnas,
        decision: decisionNormalizada,
        motivo
      }, client);

      assertFound(result, 'Documento no encontrado en tramite');

      await tramitesPagoRepo.insertHistorialDocumento({
        tramiteId,
        facturaId: normalizedFacturaId,
        accion: etapaPolicy.historialAccion,
        usuario,
        motivo
      }, client);

      await tramitesPagoRepo.touchTramite(tramiteId, client);

      await decisionPolicy.runAfterDecision({
        tramiteId,
        facturaId: normalizedFacturaId,
        usuario,
        motivo,
        client
      });

      return result;
    });
  };

  return {
    crearTramite,
    cambiarEstado,
    decisionDocumento
  };
};

module.exports = { createTramitesPagoWorkflowUseCases };
