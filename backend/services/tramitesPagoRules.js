const {
  TRAMITE_ESTADOS_SET,
  TRANSICIONES,
  DESTINOS_TESORERIA_SET,
  DOCUMENTO_DECISIONES_SET
} = require('../domain/tramitesPago');
const { FACTURA_ESTADOS } = require('../domain/facturas');
const {
  runFirstMatchingRule
} = require('./tramitesPagoRulesPolicies');
const { createTramitesPagoRulePolicyRegistry } = require('./tramitesPagoRulePolicyRegistry');

const ESTADOS_TRAMITE = TRAMITE_ESTADOS_SET;
const DESTINOS_TESORERIA = DESTINOS_TESORERIA_SET;
const rulePolicyRegistry = createTramitesPagoRulePolicyRegistry();

const normalizeEstado = (value) => (value ?? '').toString().trim().toLowerCase();

const normalizeMotivo = (value) => (value ?? '').toString().trim();

const validateAccionTesoreriaInput = (accion, destino, motivo) => {
  const policy = rulePolicyRegistry.resolveTesoreriaActionPolicy(accion);
  if (!accion || !policy) {
    return { status: 400, error: 'accion invalida' };
  }
  if (policy.requiresDestino && !DESTINOS_TESORERIA.has(destino)) {
    return { status: 400, error: 'destino invalido' };
  }
  if (policy.requiresMotivo && !normalizeMotivo(motivo)) {
    return { status: 400, error: 'motivo requerido' };
  }
  return null;
};

const validateAccionTesoreriaEstado = (accion, estadoTesActual) => {
  const policy = rulePolicyRegistry.resolveTesoreriaActionPolicy(accion);
  if (!policy) {
    return null;
  }

  return policy.validateEstadoTesoreria(estadoTesActual);
};

const validateFacturaNoPagada = (estadoFactura) => {
  if (normalizeEstado(estadoFactura) === FACTURA_ESTADOS.PAGADO) {
    return { status: 400, error: 'No se puede gestionar un documento pagado en tesoreria' };
  }
  return null;
};

const validateDecisionDocumentoInput = (etapa, decision) => {
  if (!etapa || !rulePolicyRegistry.hasEtapaDecisionPolicy(etapa)) {
    return { status: 400, error: 'etapa invalida' };
  }
  if (!decision || !DOCUMENTO_DECISIONES_SET.has(decision)) {
    return { status: 400, error: 'decision invalida' };
  }
  return null;
};

const validateCambioEstadoInput = (estado, force, motivo) => {
  const estadoNormalizado = normalizeEstado(estado);
  const validation = runFirstMatchingRule(rulePolicyRegistry.cambioEstadoInputRules, {
    estadoNormalizado,
    force,
    motivo,
    estadosTramite: ESTADOS_TRAMITE
  });
  if (validation) {
    return validation;
  }
  return { estadoNormalizado };
};

const validateTransicion = (actual, siguiente, force) => {
  const transicionPolicy = rulePolicyRegistry.transicionValidationPolicy;
  if (transicionPolicy.shouldSkipValidation({ force })) {
    return null;
  }
  const allowed = transicionPolicy.resolveAllowedTransitions({
    actual,
    transiciones: TRANSICIONES
  });
  if (!allowed.includes(siguiente)) {
    return {
      status: 400,
      error: `Transicion no permitida: ${actual} -> ${siguiente}`,
      data: allowed
    };
  }
  return null;
};

const validatePagadoSinRechazos = (totalRechazados) => {
  if (totalRechazados > 0) {
    return { status: 400, error: 'No se puede marcar como pagado con documentos rechazados' };
  }
  return null;
};

const validateFacturaIds = (facturaIds) => {
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return { status: 400, error: 'factura_ids es requerido' };
  }
  return null;
};

const validateFacturasExistentes = (facturaIds, facturasRows) => {
  if (facturasRows.length !== facturaIds.length) {
    return { status: 400, error: 'Una o mas facturas no existen' };
  }
  return null;
};

const resolveSociedadFinal = (sociedadInput, facturasRows) => {
  const sociedadesUnicas = Array.from(
    new Set(facturasRows.map((row) => row.sociedad_id))
  );

  const validation = runFirstMatchingRule(rulePolicyRegistry.sociedadResolutionRules, {
    facturasRows,
    sociedadesUnicas
  });
  if (validation) {
    return validation;
  }

  const sociedadFinal = sociedadesUnicas[0] ?? sociedadInput ?? null;
  return { sociedadFinal };
};

module.exports = {
  ESTADOS_TRAMITE,
  TRANSICIONES,
  DESTINOS_TESORERIA,
  normalizeEstado,
  validateAccionTesoreriaInput,
  validateAccionTesoreriaEstado,
  validateFacturaNoPagada,
  validateDecisionDocumentoInput,
  validateCambioEstadoInput,
  validateTransicion,
  validatePagadoSinRechazos,
  validateFacturaIds,
  validateFacturasExistentes,
  resolveSociedadFinal
};
