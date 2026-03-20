const FACTURA_ESTADOS = Object.freeze({
  NO_CONTABILIZADO: 'no_contabilizado',
  EN_REVISION: 'en_revision',
  EN_TRAMITE_PAGO: 'en_tramite_pago',
  CONTABILIZADO: 'contabilizado',
  PAGADO_PARCIALMENTE: 'pagado_parcialmente',
  RECHAZADO: 'rechazado',
  PAGADO: 'pagado'
});

const FACTURA_ESTADOS_SET = new Set(Object.values(FACTURA_ESTADOS));
const FACTURA_ESTADO_DOMINIOS = Object.freeze({
  CONTABILIZACION: 'contabilizacion',
  WORKFLOW_PAGO: 'workflow_pago',
  MIXTO: 'mixto'
});
const FACTURA_ESTADOS_CONTABILIZACION = Object.freeze({
  NO_CONTABILIZADO: FACTURA_ESTADOS.NO_CONTABILIZADO,
  EN_REVISION: FACTURA_ESTADOS.EN_REVISION,
  CONTABILIZADO: FACTURA_ESTADOS.CONTABILIZADO,
  RECHAZADO: FACTURA_ESTADOS.RECHAZADO
});
const FACTURA_ESTADOS_CONTABILIZACION_SET = new Set(Object.values(FACTURA_ESTADOS_CONTABILIZACION));
const FACTURA_WORKFLOW_PAGO_ESTADOS = Object.freeze({
  EN_TRAMITE_PAGO: FACTURA_ESTADOS.EN_TRAMITE_PAGO,
  PAGADO_PARCIALMENTE: FACTURA_ESTADOS.PAGADO_PARCIALMENTE,
  PAGADO: FACTURA_ESTADOS.PAGADO
});
const FACTURA_WORKFLOW_PAGO_ESTADOS_SET = new Set(Object.values(FACTURA_WORKFLOW_PAGO_ESTADOS));

const resolveFacturaEstadoDomain = (estado) => {
  const normalized = (estado ?? '').toString().trim().toLowerCase();

  if (FACTURA_WORKFLOW_PAGO_ESTADOS_SET.has(normalized)) {
    return FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO;
  }

  if (FACTURA_ESTADOS_CONTABILIZACION_SET.has(normalized)) {
    return FACTURA_ESTADO_DOMINIOS.CONTABILIZACION;
  }

  return null;
};

const resolveFacturaEstadoTransitionDomain = ({
  estadoAnterior,
  estadoNuevo
} = {}) => {
  const domains = Array.from(new Set(
    [resolveFacturaEstadoDomain(estadoAnterior), resolveFacturaEstadoDomain(estadoNuevo)].filter(Boolean)
  ));

  if (domains.length === 1) {
    return domains[0];
  }

  return FACTURA_ESTADO_DOMINIOS.MIXTO;
};

module.exports = {
  FACTURA_ESTADOS,
  FACTURA_ESTADOS_SET,
  FACTURA_ESTADO_DOMINIOS,
  FACTURA_ESTADOS_CONTABILIZACION,
  FACTURA_ESTADOS_CONTABILIZACION_SET,
  FACTURA_WORKFLOW_PAGO_ESTADOS,
  FACTURA_WORKFLOW_PAGO_ESTADOS_SET,
  resolveFacturaEstadoDomain,
  resolveFacturaEstadoTransitionDomain
};
