const createRuleError = (status, error, data) => {
  const result = { status, error };
  if (data !== undefined) {
    result.data = data;
  }
  return result;
};

const runFirstMatchingRule = (rules, context) => {
  for (const rule of rules) {
    const validation = rule(context);
    if (validation) {
      return validation;
    }
  }
  return null;
};

const CAMBIO_ESTADO_INPUT_RULES = Object.freeze([
  ({ estadoNormalizado }) => (
    !estadoNormalizado
      ? createRuleError(400, 'estado requerido')
      : null
  ),
  ({ estadoNormalizado, estadosTramite }) => (
    !estadosTramite.has(estadoNormalizado)
      ? createRuleError(400, 'estado invalido')
      : null
  ),
  ({ force, motivo }) => (
    force && !motivo
      ? createRuleError(400, 'motivo requerido para override')
      : null
  )
]);

const SOCIEDAD_RESOLUTION_RULES = Object.freeze([
  ({ facturasRows }) => {
    const sinSociedad = facturasRows
      .filter((row) => row.sociedad_id === null || row.sociedad_id === undefined)
      .map((row) => row.id);

    return sinSociedad.length > 0
      ? createRuleError(
        400,
        'Hay facturas sin sociedad receptora asignada',
        { facturas: sinSociedad }
      )
      : null;
  },
  ({ sociedadesUnicas }) => (
    sociedadesUnicas.length > 1
      ? createRuleError(
        400,
        'Las facturas seleccionadas pertenecen a distintas sociedades receptoras',
        { sociedades: sociedadesUnicas }
      )
      : null
  )
]);

const TRANSICION_VALIDATION_POLICY = Object.freeze({
  shouldSkipValidation: ({ force }) => Boolean(force),
  resolveAllowedTransitions: ({ actual, transiciones }) => transiciones[actual] || []
});

module.exports = {
  CAMBIO_ESTADO_INPUT_RULES,
  SOCIEDAD_RESOLUTION_RULES,
  TRANSICION_VALIDATION_POLICY,
  runFirstMatchingRule
};
