const pool = require('../db');

const listByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    'SELECT * FROM comentarios_documento WHERE factura_id = $1 ORDER BY creado_en DESC',
    [facturaId]
  );

  return rows;
};

const createComentario = async ({ facturaId, usuario, texto }) => {
  const { rows } = await pool.query(
    'INSERT INTO comentarios_documento (factura_id, usuario, texto) VALUES ($1, $2, $3) RETURNING *',
    [facturaId, usuario, texto]
  );

  return rows[0] || null;
};

module.exports = {
  listByFacturaId,
  createComentario
};
