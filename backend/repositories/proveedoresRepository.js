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
    `UPDATE proveedores
     SET identificacion_tipo = $1,
         identificacion_numero = $2,
         identificacion_numero_normalizado = $3,
         nombre = $4,
         nombre_comercial = $5,
         correo_electronico = $6,
         telefono_codigo_pais = $7,
         telefono_numero = $8,
         actualizado_en = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING id`,
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
  createProveedor,
  updateProveedor
};
