const pool = require('../db');
const getDb = (client) => client || pool;

const listSociedades = async (client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo
    FROM sociedades
    ORDER BY nombre_proyecto NULLS LAST, razon_social
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
    ORDER BY nombre_proyecto NULLS LAST, razon_social
    `,
    [ids]
  );

  return rows;
};

module.exports = {
  listSociedades,
  listSociedadesByIds
};
