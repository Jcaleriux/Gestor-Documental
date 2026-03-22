const {
  FACTURA_ESTADOS,
  FACTURA_WORKFLOW_PAGO_ESTADOS,
  FACTURA_WORKFLOW_PAGO_ESTADOS_SET
} = require('../domain/facturas');

const createFacturaWorkflowPagoJoin = ({ facturaAlias = 'f', workflowAlias = 'fwp' } = {}) => `
  LEFT JOIN facturas_workflow_pago_estado ${workflowAlias}
    ON ${workflowAlias}.factura_id = ${facturaAlias}.id
`;

const createFacturaEstadoOperativoExpression = ({ facturaAlias = 'f', workflowAlias = 'fwp' } = {}) => `
  COALESCE(${workflowAlias}.estado, ${facturaAlias}.estado, '${FACTURA_ESTADOS.NO_CONTABILIZADO}')
`;

const FACTURA_WORKFLOW_PAGO_ESTADOS_SQL = `
  (
    '${FACTURA_WORKFLOW_PAGO_ESTADOS.EN_TRAMITE_PAGO}',
    '${FACTURA_WORKFLOW_PAGO_ESTADOS.PAGADO_PARCIALMENTE}',
    '${FACTURA_WORKFLOW_PAGO_ESTADOS.PAGADO}'
  )
`;

const isFacturaWorkflowPagoEstado = (estado) => FACTURA_WORKFLOW_PAGO_ESTADOS_SET.has(estado);

module.exports = {
  createFacturaWorkflowPagoJoin,
  createFacturaEstadoOperativoExpression,
  FACTURA_WORKFLOW_PAGO_ESTADOS_SQL,
  isFacturaWorkflowPagoEstado
};
