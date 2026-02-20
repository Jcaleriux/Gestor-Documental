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

module.exports = {
  FACTURA_ESTADOS,
  FACTURA_ESTADOS_SET
};
