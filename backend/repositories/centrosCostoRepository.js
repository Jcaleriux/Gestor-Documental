const pool = require('../db');

const getDb = (client) => client || pool;

const CENTRO_COSTO_SELECT = `
  cc.id,
  cc.sociedad_id,
  cc.codigo,
  cc.nombre,
  cc.centro_padre_id,
  parent.codigo AS centro_padre_codigo,
  cc.usuario_aprobador_id,
  u.nombre AS usuario_aprobador_nombre,
  u.email AS usuario_aprobador_email,
  cc.seleccionable_en_contabilizacion,
  cc.activo,
  cc.orden,
  cc.metadata,
  cc.creado_por,
  cc.creado_en,
  cc.actualizado_en
`;

const listCentrosCostoBySociedad = async (sociedadId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${CENTRO_COSTO_SELECT}
     FROM centros_costo cc
     LEFT JOIN centros_costo parent ON parent.id = cc.centro_padre_id
     LEFT JOIN usuarios u ON u.id = cc.usuario_aprobador_id
     WHERE cc.sociedad_id = $1
     ORDER BY COALESCE(cc.orden, 2147483647) ASC, cc.codigo ASC`,
    [sociedadId]
  );

  return rows;
};

const getCentroCostoById = async (id, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${CENTRO_COSTO_SELECT}
     FROM centros_costo cc
     LEFT JOIN centros_costo parent ON parent.id = cc.centro_padre_id
     LEFT JOIN usuarios u ON u.id = cc.usuario_aprobador_id
     WHERE cc.id = $1`,
    [id]
  );

  return rows[0] || null;
};

const getCentroCostoBySociedadAndCodigo = async ({ sociedadId, codigo }, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${CENTRO_COSTO_SELECT}
     FROM centros_costo cc
     LEFT JOIN centros_costo parent ON parent.id = cc.centro_padre_id
     LEFT JOIN usuarios u ON u.id = cc.usuario_aprobador_id
     WHERE cc.sociedad_id = $1
       AND cc.codigo = $2`,
    [sociedadId, codigo]
  );

  return rows[0] || null;
};

const createCentroCosto = async ({
  sociedadId,
  codigo,
  nombre,
  centroPadreId,
  usuarioAprobadorId,
  seleccionableEnContabilizacion,
  activo,
  orden,
  metadata,
  creadoPor,
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO centros_costo (
      sociedad_id,
      codigo,
      nombre,
      centro_padre_id,
      usuario_aprobador_id,
      seleccionable_en_contabilizacion,
      activo,
      orden,
      metadata,
      creado_por
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id`,
    [
      sociedadId,
      codigo,
      nombre,
      centroPadreId || null,
      usuarioAprobadorId,
      seleccionableEnContabilizacion,
      activo,
      orden,
      metadata || null,
      creadoPor || null,
    ]
  );

  return rows[0] ? getCentroCostoById(rows[0].id, client) : null;
};

const updateCentroCosto = async ({
  id,
  codigo,
  nombre,
  centroPadreId,
  usuarioAprobadorId,
  seleccionableEnContabilizacion,
  activo,
  orden,
  metadata,
  creadoPor,
}, client) => {
  const { rows } = await getDb(client).query(
    `UPDATE centros_costo
     SET codigo = $1,
         nombre = $2,
         centro_padre_id = $3,
         usuario_aprobador_id = $4,
         seleccionable_en_contabilizacion = $5,
         activo = $6,
         orden = $7,
         metadata = $8,
         creado_por = $9,
         actualizado_en = CURRENT_TIMESTAMP
     WHERE id = $10
     RETURNING id`,
    [
      codigo,
      nombre,
      centroPadreId || null,
      usuarioAprobadorId,
      seleccionableEnContabilizacion,
      activo,
      orden,
      metadata || null,
      creadoPor || null,
      id,
    ]
  );

  return rows[0] ? getCentroCostoById(rows[0].id, client) : null;
};

const upsertCentroCostoByCodigo = async ({
  sociedadId,
  codigo,
  nombre,
  centroPadreId,
  usuarioAprobadorId,
  seleccionableEnContabilizacion,
  activo,
  orden,
  metadata,
  creadoPor,
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO centros_costo (
      sociedad_id,
      codigo,
      nombre,
      centro_padre_id,
      usuario_aprobador_id,
      seleccionable_en_contabilizacion,
      activo,
      orden,
      metadata,
      creado_por
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (sociedad_id, codigo)
    DO UPDATE SET
      nombre = EXCLUDED.nombre,
      centro_padre_id = EXCLUDED.centro_padre_id,
      usuario_aprobador_id = EXCLUDED.usuario_aprobador_id,
      seleccionable_en_contabilizacion = EXCLUDED.seleccionable_en_contabilizacion,
      activo = EXCLUDED.activo,
      orden = EXCLUDED.orden,
      metadata = EXCLUDED.metadata,
      creado_por = EXCLUDED.creado_por,
      actualizado_en = CURRENT_TIMESTAMP
    RETURNING id`,
    [
      sociedadId,
      codigo,
      nombre,
      centroPadreId || null,
      usuarioAprobadorId,
      seleccionableEnContabilizacion,
      activo,
      orden,
      metadata || null,
      creadoPor || null,
    ]
  );

  return rows[0] ? getCentroCostoById(rows[0].id, client) : null;
};

module.exports = {
  listCentrosCostoBySociedad,
  getCentroCostoById,
  getCentroCostoBySociedadAndCodigo,
  createCentroCosto,
  updateCentroCosto,
  upsertCentroCostoByCodigo,
};
