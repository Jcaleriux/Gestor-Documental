const {
  FACTURA_ESTADO_DOMINIOS,
  resolveFacturaEstadoDomain,
  resolveFacturaEstadoTransitionDomain
} = require('../domain/facturas');

describe('facturas domain helpers', () => {
  test('resolveFacturaEstadoDomain clasifica estados conocidos por dominio', () => {
    expect(resolveFacturaEstadoDomain('contabilizado')).toBe(FACTURA_ESTADO_DOMINIOS.CONTABILIZACION);
    expect(resolveFacturaEstadoDomain('en_revision')).toBe(FACTURA_ESTADO_DOMINIOS.CONTABILIZACION);
    expect(resolveFacturaEstadoDomain('pagado_parcialmente')).toBe(FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO);
    expect(resolveFacturaEstadoDomain('pagado')).toBe(FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO);
    expect(resolveFacturaEstadoDomain('otro_estado')).toBeNull();
  });

  test('resolveFacturaEstadoTransitionDomain detecta transiciones mixtas o desconocidas', () => {
    expect(resolveFacturaEstadoTransitionDomain({
      estadoAnterior: 'en_revision',
      estadoNuevo: 'contabilizado'
    })).toBe(FACTURA_ESTADO_DOMINIOS.CONTABILIZACION);

    expect(resolveFacturaEstadoTransitionDomain({
      estadoAnterior: 'en_tramite_pago',
      estadoNuevo: 'pagado'
    })).toBe(FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO);

    expect(resolveFacturaEstadoTransitionDomain({
      estadoAnterior: 'en_tramite_pago',
      estadoNuevo: 'contabilizado'
    })).toBe(FACTURA_ESTADO_DOMINIOS.MIXTO);

    expect(resolveFacturaEstadoTransitionDomain({
      estadoAnterior: null,
      estadoNuevo: 'estado_raro'
    })).toBe(FACTURA_ESTADO_DOMINIOS.MIXTO);
  });
});
