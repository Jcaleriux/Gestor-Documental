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

const createTotalPagoPrincipalExpression = ({ facturaAlias = 'f', contaAlias = 'fc' } = {}) => {
  const totalFactura = createTotalFacturaExpression({ facturaAlias });
  const rebajosAplicados = createRebajosAplicadosExpression({ contaAlias });
  const retencionTotal = createRetencionTotalExpression({ contaAlias });
  const pagosFactura = createPagosFacturaExpression({ facturaAlias });
  return `GREATEST((${totalFactura} - ${rebajosAplicados} - ${retencionTotal} - ${pagosFactura}), 0)`;
};

const createTotalPendienteGlobalExpression = ({ facturaAlias = 'f', contaAlias = 'fc' } = {}) => {
  const totalPagoPrincipal = createTotalPagoPrincipalExpression({ facturaAlias, contaAlias });
  const retencionPendiente = createRetencionPendienteExpression({ contaAlias });
  return `(${totalPagoPrincipal} + ${retencionPendiente})`;
};

module.exports = {
  createTotalFacturaExpression,
  createRebajosAplicadosExpression,
  createRetencionTotalExpression,
  createRetencionPagadaExpression,
  createRetencionPendienteExpression,
  createPagosFacturaExpression,
  createTotalPagoPrincipalExpression,
  createTotalPendienteGlobalExpression
};
