const pool = require('../db');
const getDb = (client) => client || pool;

const listSociedades = async (client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo
    FROM sociedades
    WHERE activo = true
    ORDER BY nombre_proyecto NULLS LAST, razon_social
    `
  );

  return rows;
};

const listAllSociedades = async (client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo, creado_en
    FROM sociedades
    ORDER BY activo DESC, nombre_proyecto NULLS LAST, razon_social
    `
  );

  return rows;
};

const listSociedadesByIds = async (ids, client) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const { rows } = await getDb(client).query(
    `
    SELECT id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo
    FROM sociedades
    WHERE id = ANY($1::int[])
      AND activo = true
    ORDER BY nombre_proyecto NULLS LAST, razon_social
    `,
    [ids]
  );

  return rows;
};

const createSociedad = async ({
  codigo,
  nombreProyecto,
  razonSocial,
  cedulaJuridica,
  activo
}, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO sociedades (codigo, nombre_proyecto, razon_social, cedula_juridica, activo)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo, creado_en
    `,
    [codigo, nombreProyecto, razonSocial, cedulaJuridica, activo]
  );

  return rows[0] || null;
};

const updateSociedad = async ({
  sociedadId,
  codigo,
  nombreProyecto,
  razonSocial,
  cedulaJuridica,
  activo
}, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE sociedades
    SET codigo = $2,
        nombre_proyecto = $3,
        razon_social = $4,
        cedula_juridica = $5,
        activo = $6
    WHERE id = $1
    RETURNING id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo, creado_en
    `,
    [sociedadId, codigo, nombreProyecto, razonSocial, cedulaJuridica, activo]
  );

  return rows[0] || null;
};

module.exports = {
  listSociedades,
  listAllSociedades,
  listSociedadesByIds,
  createSociedad,
  updateSociedad
};
