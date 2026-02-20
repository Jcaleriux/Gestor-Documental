const pool = require('../db');

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
  createEstado,
  updateFacturaEstado
};
