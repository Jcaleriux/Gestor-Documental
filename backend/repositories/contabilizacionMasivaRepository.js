const pool = require('../db');
const { FACTURA_ESTADO_DOMINIOS } = require('../domain/facturas');
const { createFacturaEstadoHistorial } = require('./facturaEstadoHistorialStore');

const getDb = (client) => client || pool;
const getClient = () => pool.connect();

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

const insertContabilizacionFromImport = async ({
  facturaId,
  fechaContabilizacion,
  asiento,
  centroCosto,
  metadata,
  usuario
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO facturas_contabilizacion (
       factura_id,
       fecha_contabilizacion,
       asiento,
       centro_costo,
       metadata,
       creado_por
     )
     VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6)
     ON CONFLICT (factura_id)
     DO UPDATE SET
       asiento = EXCLUDED.asiento,
       centro_costo = EXCLUDED.centro_costo,
       metadata = COALESCE(facturas_contabilizacion.metadata, '{}'::jsonb) || EXCLUDED.metadata,
       actualizado_en = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      facturaId,
      fechaContabilizacion || null,
      asiento || null,
      centroCosto || null,
      metadata || null,
      usuario || null
    ]
  );

  return rows[0] || null;
};

const updateContabilizacionImportFields = async ({
  facturaId,
  asiento,
  centroCosto,
  metadata
}, client) => {
  const { rows } = await getDb(client).query(
    `UPDATE facturas_contabilizacion
     SET
       asiento = $2,
       centro_costo = $3,
       metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
       actualizado_en = CURRENT_TIMESTAMP
     WHERE factura_id = $1
     RETURNING *`,
    [
      facturaId,
      asiento || null,
      centroCosto || null,
      metadata || {}
    ]
  );

  return rows[0] || null;
};

const updateFacturaEstado = async ({ facturaId, estado }, client) => {
  await getDb(client).query(
    'UPDATE facturas SET estado = $1 WHERE id = $2',
    [estado, facturaId]
  );
};

const insertEstadoDocumento = async ({
  facturaId,
  estadoAnterior,
  estadoNuevo,
  usuario,
  motivo
}, client) => {
  await createFacturaEstadoHistorial({
    facturaId,
    dominio: FACTURA_ESTADO_DOMINIOS.CONTABILIZACION,
    estadoAnterior,
    estadoNuevo,
    usuario,
    motivo
  }, client);
};

module.exports = {
  getClient,
  getSociedadById,
  listFacturasBySociedad,
  listCentrosCostoBySociedad,
  searchFacturasBySociedad,
  insertContabilizacionFromImport,
  updateContabilizacionImportFields,
  updateFacturaEstado,
  insertEstadoDocumento
};
