const { resolveTesoreriaActionPolicy } = require('./tramitesPagoTesoreriaPolicies');
const { hasEtapaDecisionPolicy } = require('./tramitesPagoWorkflowEtapaPolicies');
const {
  CAMBIO_ESTADO_INPUT_RULES,
  SOCIEDAD_RESOLUTION_RULES,
  TRANSICION_VALIDATION_POLICY
} = require('./tramitesPagoRulesPolicies');

const createTramitesPagoRulePolicyRegistry = () => Object.freeze({
  resolveTesoreriaActionPolicy: (accion) => resolveTesoreriaActionPolicy(accion),
  hasEtapaDecisionPolicy: (etapa) => hasEtapaDecisionPolicy(etapa),
  cambioEstadoInputRules: CAMBIO_ESTADO_INPUT_RULES,
  sociedadResolutionRules: SOCIEDAD_RESOLUTION_RULES,
  transicionValidationPolicy: TRANSICION_VALIDATION_POLICY
});

module.exports = { createTramitesPagoRulePolicyRegistry };
