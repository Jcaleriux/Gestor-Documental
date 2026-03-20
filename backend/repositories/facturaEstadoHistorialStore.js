const pool = require('../db');
const { FACTURA_ESTADO_DOMINIOS } = require('../domain/facturas');

const getDb = (client) => client || pool;

const normalizePayload = ({
  facturaId,
  dominio,
  estadoAnterior,
  estadoNuevo,
  usuario,
  motivo
}) => ({
  facturaId,
  dominio,
  estadoAnterior: estadoAnterior || null,
  estadoNuevo,
  usuario,
  motivo: motivo || null
});

const decorateHistorialRow = (row, dominio, origenHistorial) => (
  row
    ? {
      ...row,
      dominio,
      origen_historial: origenHistorial
    }
    : null
);

const insertEstadoDocumentalHistorial = async (payload, client) => {
  const db = getDb(client);
  const normalized = normalizePayload(payload);
  const { rows } = await db.query(
    `INSERT INTO facturas_estado_documental_historial (
      factura_id,
      estado_anterior,
      estado_nuevo,
      usuario,
      motivo
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      normalized.facturaId,
      normalized.estadoAnterior,
      normalized.estadoNuevo,
      normalized.usuario,
      normalized.motivo
    ]
  );

  return rows[0] || null;
};

const insertWorkflowPagoHistorial = async (payload, client) => {
  const db = getDb(client);
  const normalized = normalizePayload(payload);
  const { rows } = await db.query(
    `INSERT INTO facturas_workflow_pago_historial (
      factura_id,
      estado_anterior,
      estado_nuevo,
      usuario,
      motivo
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      normalized.facturaId,
      normalized.estadoAnterior,
      normalized.estadoNuevo,
      normalized.usuario,
      normalized.motivo
    ]
  );

  return rows[0] || null;
};

const insertMixtoHistorial = async (payload, client) => {
  const db = getDb(client);
  const normalized = normalizePayload(payload);
  const { rows } = await db.query(
    `INSERT INTO facturas_estado_mixto_historial (
      factura_id,
      estado_anterior,
      estado_nuevo,
      usuario,
      motivo
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      normalized.facturaId,
      normalized.estadoAnterior,
      normalized.estadoNuevo,
      normalized.usuario,
      normalized.motivo
    ]
  );

  return rows[0] || null;
};

const createFacturaEstadoHistorial = async (payload, client) => {
  const normalized = normalizePayload(payload);

  if (normalized.dominio === FACTURA_ESTADO_DOMINIOS.CONTABILIZACION) {
    return decorateHistorialRow(
      await insertEstadoDocumentalHistorial(normalized, client),
      FACTURA_ESTADO_DOMINIOS.CONTABILIZACION,
      'facturas_estado_documental_historial'
    );
  }

  if (normalized.dominio === FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO) {
    return decorateHistorialRow(
      await insertWorkflowPagoHistorial(normalized, client),
      FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO,
      'facturas_workflow_pago_historial'
    );
  }

  return decorateHistorialRow(
    await insertMixtoHistorial(normalized, client),
    FACTURA_ESTADO_DOMINIOS.MIXTO,
    'facturas_estado_mixto_historial'
  );
};

module.exports = {
  createFacturaEstadoHistorial
};
