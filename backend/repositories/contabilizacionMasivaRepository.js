const pool = require('../db');

const getDb = (client) => client || pool;

const getSociedadById = async (sociedadId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo
     FROM sociedades
     WHERE id = $1`,
    [sociedadId]
  );

  return rows[0] || null;
};

const listFacturasBySociedad = async (sociedadId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       f.id,
       f.sociedad_id,
       f.clave,
       f.consecutivo,
       f.fecha_emision,
       f.emisor,
       f.resumen,
       f.estado,
       fc.id AS contabilizacion_id,
       fc.asiento AS contabilizacion_asiento,
       fc.centro_costo AS contabilizacion_centro_costo,
       fc.metadata AS contabilizacion_metadata
     FROM facturas f
     LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
     WHERE f.sociedad_id = $1
     ORDER BY f.fecha_emision DESC NULLS LAST, f.id DESC`,
    [sociedadId]
  );

  return rows;
};

const listCentrosCostoBySociedad = async (sociedadId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       cc.id,
       cc.sociedad_id,
       cc.codigo,
       cc.nombre,
       cc.usuario_aprobador_id,
       u.nombre AS usuario_aprobador_nombre,
       u.email AS usuario_aprobador_email,
       cc.rol_aprobador_id,
       r.codigo AS rol_aprobador_codigo,
       r.nombre AS rol_aprobador_nombre,
       cc.activo,
       cc.seleccionable_en_contabilizacion
     FROM centros_costo cc
     LEFT JOIN usuarios u ON u.id = cc.usuario_aprobador_id
     LEFT JOIN roles r ON r.id = cc.rol_aprobador_id
     WHERE cc.sociedad_id = $1
     ORDER BY cc.codigo ASC`,
    [sociedadId]
  );

  return rows;
};

const searchFacturasBySociedad = async ({ sociedadId, query, limit = 10 }, client) => {
  const normalizedQuery = `%${String(query || '').trim().toLowerCase()}%`;
  const { rows } = await getDb(client).query(
    `SELECT
       f.id,
       f.sociedad_id,
       f.clave,
       f.consecutivo,
       f.fecha_emision,
       f.emisor,
       f.resumen,
       f.estado,
       fc.id AS contabilizacion_id,
       fc.asiento AS contabilizacion_asiento
     FROM facturas f
     LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
     WHERE f.sociedad_id = $1
       AND (
         LOWER(COALESCE(f.consecutivo::text, '')) LIKE $2
         OR LOWER(COALESCE(f.clave::text, '')) LIKE $2
         OR LOWER(COALESCE(f.emisor->>'Nombre', f.emisor->>'nombre', '')) LIKE $2
         OR LOWER(COALESCE(f.emisor #>> '{Identificacion,Numero}', f.emisor #>> '{identificacion,numero}', '')) LIKE $2
       )
     ORDER BY f.fecha_emision DESC NULLS LAST, f.id DESC
     LIMIT $3`,
    [sociedadId, normalizedQuery, limit]
  );

  return rows;
};

module.exports = {
  getSociedadById,
  listFacturasBySociedad,
  listCentrosCostoBySociedad,
  searchFacturasBySociedad
};
