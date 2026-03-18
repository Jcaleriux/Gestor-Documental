const { TRAMITE_ESTADOS, DOCUMENTO_ACCIONES, DOCUMENTO_DECISIONES } = require('../domain/tramitesPago');
const { ETAPA_DECISION_POLICIES } = require('./tramitesPagoWorkflowEtapaPolicies');

const NO_OP_DECISION_POLICY = Object.freeze({
  runAfterDecision: async () => {}
});

const createDefaultRechazadoDecisionPolicy = ({ tramitesPagoRepo }) => ({
  runAfterDecision: async ({ tramiteId, facturaId, usuario, motivo, client }) => {
    await tramitesPagoRepo.updateDocumentoTesoreriaPendiente({
      tramiteId,
      facturaId
    }, client);

    const tramiteEstado = await tramitesPagoRepo.getTramiteEstado(tramiteId, client);
    const estadoAnterior = tramiteEstado ? tramiteEstado.estado : null;
    const estadoNuevo = TRAMITE_ESTADOS.EN_REVISION_TESORERIA;

    await tramitesPagoRepo.updateTramiteEstado({
      tramiteId,
      estado: estadoNuevo
    }, client);

    await tramitesPagoRepo.insertHistorialDocumentoConEstados({
      tramiteId,
      facturaId,
      accion: DOCUMENTO_ACCIONES.DEVOLVER_TESORERIA,
      estadoAnterior,
      estadoNuevo,
      usuario,
      motivo
    }, client);
  }
});

const DEFAULT_RECHAZADO_STAGE_FACTORIES = Object.freeze(
  Object.keys(ETAPA_DECISION_POLICIES).reduce((acc, etapa) => {
    acc[etapa] = createDefaultRechazadoDecisionPolicy;
    return acc;
  }, {})
);

const createPoliciesByEtapa = ({ stageFactories, context }) => Object.freeze(
  Object.entries(stageFactories).reduce((acc, [etapa, factory]) => {
    acc[etapa] = factory(context);
    return acc;
  }, {})
);

const createDecisionDocumentoPolicies = ({ tramitesPagoRepo }) => {
  const context = { tramitesPagoRepo };
  const rejectedDefaultPolicy = createDefaultRechazadoDecisionPolicy(context);

  return Object.freeze({
    [DOCUMENTO_DECISIONES.RECHAZADO]: Object.freeze({
      byEtapa: createPoliciesByEtapa({
        stageFactories: DEFAULT_RECHAZADO_STAGE_FACTORIES,
        context
      }),
      defaultPolicy: rejectedDefaultPolicy
    })
  });
};

const resolveDecisionDocumentoPolicy = ({ policies, decision, etapa }) => {
  const decisionConfig = policies[decision];
  if (!decisionConfig) {
    return NO_OP_DECISION_POLICY;
  }

  return decisionConfig.byEtapa?.[etapa] || decisionConfig.defaultPolicy || NO_OP_DECISION_POLICY;
};

module.exports = {
  createDecisionDocumentoPolicies,
  resolveDecisionDocumentoPolicy
};
