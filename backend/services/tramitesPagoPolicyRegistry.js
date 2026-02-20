const { resolveTesoreriaActionPolicy } = require('./tramitesPagoTesoreriaPolicies');
const {
  createTesoreriaActionHandlers,
  resolveTesoreriaActionHandler
} = require('./tramitesPagoTesoreriaActionHandlers');
const { createTramitesPagoRulePolicyRegistry } = require('./tramitesPagoRulePolicyRegistry');
const {
  createCambioEstadoPolicies,
  resolveCambioEstadoPolicy
} = require('./tramitesPagoWorkflowStatePolicies');
const {
  createDecisionDocumentoPolicies,
  resolveDecisionDocumentoPolicy
} = require('./tramitesPagoWorkflowDecisionPolicies');
const { resolveEtapaDecisionPolicy } = require('./tramitesPagoWorkflowEtapaPolicies');
const { resolveCreateTramiteItemPolicy } = require('./tramitesPagoWorkflowCreatePolicies');

const createTramitesPagoPolicyRegistry = ({ tramitesPagoRepo }) => {
  const rulePolicyRegistry = createTramitesPagoRulePolicyRegistry();
  const cambioEstadoPolicies = createCambioEstadoPolicies({ tramitesPagoRepo });
  const decisionDocumentoPolicies = createDecisionDocumentoPolicies({ tramitesPagoRepo });
  const tesoreriaActionHandlers = createTesoreriaActionHandlers({ tramitesPagoRepo });

  return Object.freeze({
    rules: rulePolicyRegistry,
    tesoreria: Object.freeze({
      resolveActionPolicy: (accion) => resolveTesoreriaActionPolicy(accion),
      resolveActionHandler: (handlerType) => resolveTesoreriaActionHandler({
        handlers: tesoreriaActionHandlers,
        handlerType
      })
    }),
    workflow: Object.freeze({
      resolveCreateItemPolicy: (itemType) => resolveCreateTramiteItemPolicy(itemType),
      resolveEstadoPolicy: (estadoDestino) => resolveCambioEstadoPolicy({
        policies: cambioEstadoPolicies,
        estadoDestino
      }),
      resolveEtapaPolicy: (etapa) => resolveEtapaDecisionPolicy(etapa),
      resolveDecisionPolicy: ({ decision, etapa }) => resolveDecisionDocumentoPolicy({
        policies: decisionDocumentoPolicies,
        decision,
        etapa
      })
    })
  });
};

module.exports = { createTramitesPagoPolicyRegistry };
