const createTotalFacturaExpression = ({ facturaAlias = 'f' } = {}) => `
  CASE
    WHEN COALESCE(${facturaAlias}.resumen->>'TotalComprobante', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
      THEN (${facturaAlias}.resumen->>'TotalComprobante')::numeric
    ELSE 0
  END
`;

const createRebajosAplicadosExpression = ({ contaAlias = 'fc' } = {}) => `
  (
    COALESCE(${contaAlias}.descuento, 0)
    + COALESCE(${contaAlias}.anticipo_aplicado, 0)
    + COALESCE(${contaAlias}.monto_nota_credito, 0)
  )
`;

const createRetencionTotalExpression = ({ contaAlias = 'fc' } = {}) =>
  `COALESCE(${contaAlias}.retencion, 0)`;

const createRetencionPagadaExpression = ({ contaAlias = 'fc' } = {}) =>
  `COALESCE(${contaAlias}.retencion_pagada, 0)`;

const createRetencionPendienteExpression = ({ contaAlias = 'fc' } = {}) => {
  const retencionTotal = createRetencionTotalExpression({ contaAlias });
  const retencionPagada = createRetencionPagadaExpression({ contaAlias });
  return `GREATEST((${retencionTotal} - ${retencionPagada}), 0)`;
};

const createPagosFacturaExpression = ({ facturaAlias = 'f' } = {}) => `
  COALESCE((
    SELECT SUM(fp.monto)
    FROM facturas_pagos fp
    WHERE fp.factura_id = ${facturaAlias}.id
  ), 0)
`;

const MONTO_MONEDA_SCALE = 2;
const MONTO_MONEDA_EPSILON = 0.005;

const createNormalizedCurrencyExpression = (valueExpression) => `
  CASE
    WHEN ABS(${valueExpression}) < ${MONTO_MONEDA_EPSILON} THEN 0
    ELSE ROUND(${valueExpression}, ${MONTO_MONEDA_SCALE})
  END
`;

const createTotalPagoBaseExpression = ({ facturaAlias = 'f', contaAlias = 'fc' } = {}) => {
  const totalFactura = createTotalFacturaExpression({ facturaAlias });
  const rebajosAplicados = createRebajosAplicadosExpression({ contaAlias });
  const retencionTotal = createRetencionTotalExpression({ contaAlias });
  return `GREATEST((${totalFactura} - ${rebajosAplicados} - ${retencionTotal}), 0)`;
};

const createTotalPagoPrincipalExpression = ({ facturaAlias = 'f', contaAlias = 'fc' } = {}) => {
  const totalPagoBase = createTotalPagoBaseExpression({ facturaAlias, contaAlias });
  const pagosFactura = createPagosFacturaExpression({ facturaAlias });
  return `GREATEST(${createNormalizedCurrencyExpression(`(${totalPagoBase} - ${pagosFactura})`)}, 0)`;
};

const createTotalPendienteGlobalExpression = ({ facturaAlias = 'f', contaAlias = 'fc' } = {}) => {
  const totalPagoPrincipal = createTotalPagoPrincipalExpression({ facturaAlias, contaAlias });
  const retencionPendiente = createRetencionPendienteExpression({ contaAlias });
  return createNormalizedCurrencyExpression(`(${totalPagoPrincipal} + ${retencionPendiente})`);
};

module.exports = {
  createTotalFacturaExpression,
  createRebajosAplicadosExpression,
  createRetencionTotalExpression,
  createRetencionPagadaExpression,
  createRetencionPendienteExpression,
  createPagosFacturaExpression,
  createNormalizedCurrencyExpression,
  createTotalPagoBaseExpression,
  createTotalPagoPrincipalExpression,
  createTotalPendienteGlobalExpression
};
