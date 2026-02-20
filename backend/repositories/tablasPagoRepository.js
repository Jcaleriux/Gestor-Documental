const pool = require('../db');

const getDb = (client) => client || pool;
const TABLA_PAGO_SELECT = `
  tp.id,
  tp.sociedad_id,
  tp.proveedor_id,
  tp.nombre,
  tp.ruta_pdf,
  tp.creado_por,
  tp.metadata,
  tp.creado_en,
  tp.actualizado_en
`;

const listTablasPago = async ({ sociedadId, proveedorId }, client) => {
  const params = [sociedadId];
  let whereClause = 'WHERE tp.sociedad_id = $1';

  if (proveedorId) {
    params.push(proveedorId);
    whereClause += ` AND tp.proveedor_id = $${params.length}`;
  }

  const { rows } = await getDb(client).query(
    `SELECT ${TABLA_PAGO_SELECT}
     FROM tablas_pago tp
     ${whereClause}
     ORDER BY tp.creado_en DESC`,
    params
  );
  return rows;
};

const getTablaPagoById = async (id, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${TABLA_PAGO_SELECT}
     FROM tablas_pago tp
     WHERE tp.id = $1`,
    [id]
  );
  return rows[0] || null;
};

const getTablaPagoByIdAndSociedad = async ({ id, sociedadId }, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${TABLA_PAGO_SELECT}
     FROM tablas_pago tp
     WHERE tp.id = $1
       AND tp.sociedad_id = $2`,
    [id, sociedadId]
  );
  return rows[0] || null;
};

const countFacturasAsociadas = async (tablaPagoId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT COUNT(*)::int AS total
     FROM facturas_contabilizacion
     WHERE tabla_pago_id = $1`,
    [tablaPagoId]
  );
  return rows[0]?.total || 0;
};

const createTablaPago = async ({
  sociedadId,
  proveedorId,
  nombre,
  rutaPdf,
  creadoPor,
  metadata
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO tablas_pago
     (sociedad_id, proveedor_id, nombre, ruta_pdf, creado_por, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [sociedadId, proveedorId, nombre, rutaPdf, creadoPor, metadata || null]
  );

  if (!rows[0]) {
    return null;
  }

  return getTablaPagoById(rows[0].id, client);
};

const deleteTablaPagoById = async (id, client) => {
  const { rows } = await getDb(client).query(
    `DELETE FROM tablas_pago tp
     WHERE tp.id = $1
     RETURNING ${TABLA_PAGO_SELECT}`,
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  listTablasPago,
  getTablaPagoById,
  getTablaPagoByIdAndSociedad,
  countFacturasAsociadas,
  createTablaPago,
  deleteTablaPagoById
};
