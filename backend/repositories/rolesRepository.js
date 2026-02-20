const pool = require('../db');

const getDb = (client) => client || pool;

const listRoles = async (client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, codigo, nombre, descripcion, nivel_jerarquia, creado_en
     FROM roles
     ORDER BY nivel_jerarquia DESC, nombre ASC`
  );
  return rows;
};

const getRoleById = async (roleId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, codigo, nombre, descripcion, nivel_jerarquia
     FROM roles
     WHERE id = $1`,
    [roleId]
  );
  return rows[0] || null;
};

module.exports = {
  listRoles,
  getRoleById
};
