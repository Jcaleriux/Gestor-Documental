const pool = require('../db');

const getDb = (client) => client || pool;
const PROVEEDOR_SELECT = `
  id,
  sociedad_id,
  identificacion_tipo,
  identificacion_numero,
  identificacion_numero_normalizado,
  nombre,
  nombre_comercial,
  correo_electronico,
  telefono_codigo_pais,
  telefono_numero,
  creado_en,
  actualizado_en
`;

const listProveedoresBySociedad = async (sociedadId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${PROVEEDOR_SELECT}
     FROM proveedores
     WHERE sociedad_id = $1
     ORDER BY nombre ASC, identificacion_numero ASC`,
    [sociedadId]
  );
  return rows;
};

const getProveedorById = async (id, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${PROVEEDOR_SELECT}
     FROM proveedores
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

const getProveedorByIdAndSociedad = async ({ id, sociedadId }, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${PROVEEDOR_SELECT}
     FROM proveedores
     WHERE id = $1
       AND sociedad_id = $2`,
    [id, sociedadId]
  );
  return rows[0] || null;
};

const getByIdentificacionNormalizada = async ({ sociedadId, identificacionNormalizada }, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${PROVEEDOR_SELECT}
     FROM proveedores
     WHERE sociedad_id = $1
       AND identificacion_numero_normalizado = $2`,
    [sociedadId, identificacionNormalizada]
  );
  return rows[0] || null;
};

const listProveedorHistorialCambios = async ({ proveedorId, limit = 100 }, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       id,
       proveedor_id,
       campo,
       valor_anterior,
       valor_nuevo,
       origen,
       creado_en
     FROM proveedores_historial_cambios
     WHERE proveedor_id = $1
     ORDER BY creado_en DESC, id DESC
     LIMIT $2`,
    [proveedorId, limit]
  );
  return rows;
};

const createProveedor = async ({
  sociedadId,
  identificacionTipo,
  identificacionNumero,
  identificacionNumeroNormalizado,
  nombre,
  nombreComercial,
  correoElectronico,
  telefonoCodigoPais,
  telefonoNumero
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO proveedores
     (
       sociedad_id,
       identificacion_tipo,
       identificacion_numero,
       identificacion_numero_normalizado,
       nombre,
       nombre_comercial,
       correo_electronico,
       telefono_codigo_pais,
       telefono_numero
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      sociedadId,
      identificacionTipo,
      identificacionNumero,
      identificacionNumeroNormalizado,
      nombre,
      nombreComercial,
      correoElectronico,
      telefonoCodigoPais,
      telefonoNumero
    ]
  );

  if (!rows[0]) {
    return null;
  }

  return getProveedorById(rows[0].id, client);
};

const updateProveedor = async ({
  id,
  identificacionTipo,
  identificacionNumero,
  identificacionNumeroNormalizado,
  nombre,
  nombreComercial,
  correoElectronico,
  telefonoCodigoPais,
  telefonoNumero
}, client) => {
  const { rows } = await getDb(client).query(
    `WITH existing AS (
       SELECT *
       FROM proveedores
       WHERE id = $9
     ),
     incoming AS (
       SELECT
         $1::varchar AS identificacion_tipo,
         $2::varchar AS identificacion_numero,
         $3::varchar AS identificacion_numero_normalizado,
         $4::varchar AS nombre,
         $5::varchar AS nombre_comercial,
         $6::varchar AS correo_electronico,
         $7::varchar AS telefono_codigo_pais,
         $8::varchar AS telefono_numero
     ),
     changes AS (
       SELECT
         e.id AS proveedor_id,
         changed.campo,
         changed.valor_anterior,
         changed.valor_nuevo
       FROM existing e
       JOIN incoming i ON true
       CROSS JOIN LATERAL (
         VALUES
           ('identificacion_tipo', e.identificacion_tipo::text, i.identificacion_tipo::text),
           ('identificacion_numero', e.identificacion_numero::text, i.identificacion_numero::text),
           ('nombre', e.nombre::text, i.nombre::text),
           ('nombre_comercial', e.nombre_comercial::text, i.nombre_comercial::text),
           ('correo_electronico', e.correo_electronico::text, i.correo_electronico::text),
           ('telefono_codigo_pais', e.telefono_codigo_pais::text, i.telefono_codigo_pais::text),
           ('telefono_numero', e.telefono_numero::text, i.telefono_numero::text)
       ) AS changed(campo, valor_anterior, valor_nuevo)
       WHERE changed.valor_nuevo IS DISTINCT FROM changed.valor_anterior
     ),
     updated AS (
       UPDATE proveedores p
       SET identificacion_tipo = i.identificacion_tipo,
           identificacion_numero = i.identificacion_numero,
           identificacion_numero_normalizado = i.identificacion_numero_normalizado,
           nombre = i.nombre,
           nombre_comercial = i.nombre_comercial,
           correo_electronico = i.correo_electronico,
           telefono_codigo_pais = i.telefono_codigo_pais,
           telefono_numero = i.telefono_numero,
           actualizado_en = CURRENT_TIMESTAMP
       FROM incoming i
       WHERE p.id = $9
         AND EXISTS (SELECT 1 FROM changes)
       RETURNING p.id
     ),
     history AS (
       INSERT INTO proveedores_historial_cambios
         (proveedor_id, campo, valor_anterior, valor_nuevo, origen)
       SELECT proveedor_id, campo, valor_anterior, valor_nuevo, 'admin_proveedores'
       FROM changes
       WHERE EXISTS (SELECT 1 FROM updated)
       RETURNING id
     )
     SELECT id
     FROM updated
     UNION ALL
     SELECT id
     FROM existing
     WHERE NOT EXISTS (SELECT 1 FROM updated)
     LIMIT 1`,
    [
      identificacionTipo,
      identificacionNumero,
      identificacionNumeroNormalizado,
      nombre,
      nombreComercial,
      correoElectronico,
      telefonoCodigoPais,
      telefonoNumero,
      id
    ]
  );

  if (!rows[0]) {
    return null;
  }

  return getProveedorById(rows[0].id, client);
};

module.exports = {
  listProveedoresBySociedad,
  getProveedorById,
  getProveedorByIdAndSociedad,
  getByIdentificacionNormalizada,
  listProveedorHistorialCambios,
  createProveedor,
  updateProveedor
};
