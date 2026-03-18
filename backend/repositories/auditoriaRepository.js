const pool = require('../db');
const monedaFacturaExpression = `
  upper(
    COALESCE(
      f.resumen #>> '{CodigoTipoMoneda,CodigoMoneda}',
      f.resumen #>> '{codigoTipoMoneda,codigoMoneda}',
      f.resumen ->> 'CodigoMoneda',
      f.resumen ->> 'codigoMoneda',
      'CRC'
    )
  )
`;

const listAuditoriaByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `SELECT
      a.id, a.accion, a.usuario, a.detalles, a.ip_address, a.creado_en
     FROM auditoria a
     WHERE a.factura_id = $1
     ORDER BY a.creado_en DESC`,
    [facturaId]
  );

  return rows;
};

const createAuditoria = async ({ facturaId, accion, usuario, detalles, ip_address }) => {
  const { rows } = await pool.query(
    `INSERT INTO auditoria (factura_id, accion, usuario, detalles, ip_address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [facturaId, accion, usuario, detalles, ip_address]
  );

  return rows[0] || null;
};

const listEstadosByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    'SELECT * FROM estados_documento WHERE factura_id = $1 ORDER BY creado_en DESC',
    [facturaId]
  );

  return rows;
};

const listTramiteHistorialByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      h.*,
      t.estado AS tramite_estado
    FROM tramites_pago_historial h
    LEFT JOIN tramites_pago t ON t.id = h.tramite_id
    WHERE h.factura_id = $1
    ORDER BY h.creado_en DESC, h.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listGerenciaAprobacionesByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      tda.*,
      t.estado AS tramite_estado
    FROM tramites_pago_documentos_aprobadores tda
    LEFT JOIN tramites_pago t ON t.id = tda.tramite_id
    WHERE tda.factura_id = $1
      AND tda.decision_en IS NOT NULL
    ORDER BY tda.decision_en DESC, tda.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listTramiteDocumentoLinksByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      td.id,
      td.tramite_id,
      td.factura_id,
      td.estado_factura_origen,
      td.estado_tesoreria,
      td.motivo_tesoreria,
      td.actualizado_en,
      t.estado AS tramite_estado,
      t.creado_en AS tramite_creado_en,
      t.creado_por AS tramite_creado_por
    FROM tramites_pago_documentos td
    JOIN tramites_pago t ON t.id = td.tramite_id
    WHERE td.factura_id = $1
    ORDER BY t.creado_en DESC, td.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listPagosFacturaByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      fp.*,
      ${monedaFacturaExpression} AS moneda
    FROM facturas_pagos fp
    JOIN facturas f ON f.id = fp.factura_id
    WHERE fp.factura_id = $1
    ORDER BY COALESCE(fp.fecha_pago, CURRENT_DATE) DESC, fp.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listRetencionPagosByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      rp.*,
      ${monedaFacturaExpression} AS moneda
    FROM facturas_retenciones_pagos rp
    JOIN facturas f ON f.id = rp.factura_id
    WHERE rp.factura_id = $1
    ORDER BY COALESCE(rp.fecha_pago, CURRENT_DATE) DESC, rp.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const createEstado = async ({ facturaId, estado_anterior, estado_nuevo, usuario, motivo }) => {
  const { rows } = await pool.query(
    `INSERT INTO estados_documento (factura_id, estado_anterior, estado_nuevo, usuario, motivo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [facturaId, estado_anterior || null, estado_nuevo, usuario, motivo || null]
  );

  return rows[0] || null;
};

const updateFacturaEstado = async ({ facturaId, estado }) => {
  const { rows } = await pool.query(
    'UPDATE facturas SET estado = $1 WHERE id = $2 RETURNING id, estado',
    [estado, facturaId]
  );

  return rows[0] || null;
};

module.exports = {
  listAuditoriaByFacturaId,
  createAuditoria,
  listEstadosByFacturaId,
  listTramiteHistorialByFacturaId,
  listGerenciaAprobacionesByFacturaId,
  listTramiteDocumentoLinksByFacturaId,
  listPagosFacturaByFacturaId,
  listRetencionPagosByFacturaId,
  createEstado,
  updateFacturaEstado
};
