const { ETAPAS_DOC } = require('../domain/tramitesPago');

const ETAPA_DECISION_POLICIES = Object.freeze(
  Object.entries(ETAPAS_DOC).reduce((acc, [etapa, config]) => {
    acc[etapa] = Object.freeze({
      columnas: Object.freeze({
        estado: config.estado,
        motivo: config.motivo,
        accion: config.accion
      }),
      historialAccion: config.accion
    });
    return acc;
  }, {})
);

const resolveEtapaDecisionPolicy = (etapa) => ETAPA_DECISION_POLICIES[etapa] || null;
const hasEtapaDecisionPolicy = (etapa) => Boolean(resolveEtapaDecisionPolicy(etapa));

module.exports = {
  ETAPA_DECISION_POLICIES,
  resolveEtapaDecisionPolicy,
  hasEtapaDecisionPolicy
};
