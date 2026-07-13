const pool = require('../db');

const getDb = (client) => client || pool;
const getClient = () => pool.connect();

const getPermissionNamesByRolId = async (rolId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT p.nombre
     FROM roles_permisos rp
     INNER JOIN permisos p ON p.id = rp.permiso_id
     WHERE rp.rol_id = $1
     ORDER BY p.nombre ASC`,
    [rolId]
  );

  return rows.map((row) => row.nombre);
};

const listPermisos = async (client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, nombre, descripcion, creado_en
     FROM permisos
     ORDER BY nombre ASC`
  );
  return rows;
};

const listPermisosByNames = async (permissionNames, client) => {
  if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
    return [];
  }

  const { rows } = await getDb(client).query(
    `SELECT id, nombre, descripcion, creado_en
     FROM permisos
     WHERE nombre = ANY($1::text[])
     ORDER BY nombre ASC`,
    [permissionNames]
  );
  return rows;
};

const replaceRolePermissions = async ({ roleId, permissionIds }, client) => {
  const db = getDb(client);

  await db.query('DELETE FROM roles_permisos WHERE rol_id = $1', [roleId]);

  if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
    return;
  }

  await db.query(
    `INSERT INTO roles_permisos (rol_id, permiso_id)
     SELECT $1, permisos.permiso_id
     FROM unnest($2::int[]) AS permisos(permiso_id)
     ON CONFLICT (rol_id, permiso_id) DO NOTHING`,
    [roleId, permissionIds]
  );
};

module.exports = {
  getClient,
  getPermissionNamesByRolId,
  listPermisos,
  listPermisosByNames,
  replaceRolePermissions
};
