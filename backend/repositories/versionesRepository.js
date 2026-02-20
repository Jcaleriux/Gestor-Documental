const pool = require('../db');

const listVersionesByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    'SELECT * FROM versiones_documento WHERE factura_id = $1 ORDER BY numero DESC',
    [facturaId]
  );

  return rows;
};

const getMaxNumeroByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    'SELECT MAX(numero) as max_numero FROM versiones_documento WHERE factura_id = $1',
    [facturaId]
  );

  return rows[0] && rows[0].max_numero ? Number(rows[0].max_numero) : 0;
};

const createVersion = async ({ facturaId, numero, usuario, cambios, ruta_archivo }) => {
  const { rows } = await pool.query(
    'INSERT INTO versiones_documento (factura_id, numero, usuario, cambios, ruta_archivo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [facturaId, numero, usuario, cambios, ruta_archivo || null]
  );

  return rows[0] || null;
};

module.exports = {
  listVersionesByFacturaId,
  getMaxNumeroByFacturaId,
  createVersion
};
