const {
  normalizeEstado,
  validateDecisionDocumentoInput,
  validateCambioEstadoInput,
  validateTransicion
} = require('./tramitesPagoRules');
const { TRAMITE_ACCIONES } = require('../domain/tramitesPago');
const { createError, assertFound, throwIfValidationError } = require('../utils/errors');
const {
  normalizeUniquePositiveIds
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
    const estadoCheck = validateCambioEstadoInput(estado, force, motivo);
    throwIfValidationError(estadoCheck);
    const { estadoNormalizado } = estadoCheck;
    const estadoPolicy = resolveEstadoPolicy(estadoNormalizado);

    return runInTransaction(async (client) => {
      const tramite = await tramitesPagoRepo.getTramiteById(id, client);
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
        tramiteId: id,
        sameNormalized,
        client
      });

      const updateRes = await tramitesPagoRepo.updateTramiteEstado({
        tramiteId: id,
        estado: estadoNormalizado
      }, client);

      await tramitesPagoRepo.insertHistorialConEstados({
        tramiteId: id,
        accion: force ? TRAMITE_ACCIONES.OVERRIDE_ESTADO : TRAMITE_ACCIONES.CAMBIAR_ESTADO,
        estadoAnterior: actualRaw,
        estadoNuevo: estadoNormalizado,
        usuario,
        motivo
      }, client);

      await estadoPolicy.runAfterUpdate({
        tramiteId: id,
        usuario,
        pagosDocumentos: pagos_documentos,
        client
      });

      return updateRes;
    });
  };

  const decisionDocumento = async ({ id, facturaId, etapa, decision, motivo, usuario }) => {
    throwIfValidationError(validateDecisionDocumentoInput(etapa, decision));

    const etapaPolicy = resolveEtapaPolicy(etapa);
    if (!etapaPolicy) {
      throwIfValidationError({ status: 400, error: 'etapa invalida' });
    }

    const columnas = etapaPolicy.columnas;
    const decisionPolicy = resolveDecisionPolicy({ decision, etapa });

    return runInTransaction(async (client) => {
      const result = await tramitesPagoRepo.updateDocumentoDecision({
        tramiteId: id,
        facturaId,
        columnas,
        decision,
        motivo
      }, client);

      assertFound(result, 'Documento no encontrado en tramite');

      await tramitesPagoRepo.insertHistorialDocumento({
        tramiteId: id,
        facturaId,
        accion: etapaPolicy.historialAccion,
        usuario,
        motivo
      }, client);

      await tramitesPagoRepo.touchTramite(id, client);

      await decisionPolicy.runAfterDecision({
        tramiteId: id,
        facturaId,
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
