const pool = require('../db');

const getDb = (client) => client || pool;
const getClient = () => pool.connect();

const listRoles = async (client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, codigo, nombre, descripcion, nivel_jerarquia, creado_en
     FROM roles
     ORDER BY nivel_jerarquia DESC, nombre ASC`
  );
  return rows;
};

const listRolesWithPermissions = async (client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       r.id,
       r.codigo,
       r.nombre,
       r.descripcion,
       r.nivel_jerarquia,
       r.creado_en,
       COALESCE(
         array_remove(array_agg(p.nombre ORDER BY p.nombre), NULL),
         ARRAY[]::text[]
       ) AS permisos
     FROM roles r
     LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
     LEFT JOIN permisos p ON p.id = rp.permiso_id
     GROUP BY r.id
     ORDER BY r.nivel_jerarquia DESC, r.nombre ASC`
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

const getRoleWithPermissionsById = async (roleId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       r.id,
       r.codigo,
       r.nombre,
       r.descripcion,
       r.nivel_jerarquia,
       r.creado_en,
       COALESCE(
         array_remove(array_agg(p.nombre ORDER BY p.nombre), NULL),
         ARRAY[]::text[]
       ) AS permisos
     FROM roles r
     LEFT JOIN roles_permisos rp ON rp.rol_id = r.id
     LEFT JOIN permisos p ON p.id = rp.permiso_id
     WHERE r.id = $1
     GROUP BY r.id`,
    [roleId]
  );
  return rows[0] || null;
};

const getRoleByCodigo = async (codigo, client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, codigo, nombre, descripcion, nivel_jerarquia
     FROM roles
     WHERE codigo = $1`,
    [codigo]
  );
  return rows[0] || null;
};

const getRoleByNombre = async (nombre, client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, codigo, nombre, descripcion, nivel_jerarquia
     FROM roles
     WHERE LOWER(nombre) = LOWER($1)`,
    [nombre]
  );
  return rows[0] || null;
};

const createRole = async ({
  codigo,
  nombre,
  descripcion,
  nivelJerarquia
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO roles (codigo, nombre, descripcion, nivel_jerarquia)
     VALUES ($1, $2, $3, $4)
     RETURNING id, codigo, nombre, descripcion, nivel_jerarquia, creado_en`,
    [codigo, nombre, descripcion, nivelJerarquia]
  );
  return rows[0] || null;
};

const updateRole = async ({
  roleId,
  nombre,
  descripcion,
  nivelJerarquia
}, client) => {
  const { rows } = await getDb(client).query(
    `UPDATE roles
     SET nombre = $1,
         descripcion = $2,
         nivel_jerarquia = $3
     WHERE id = $4
     RETURNING id, codigo, nombre, descripcion, nivel_jerarquia, creado_en`,
    [nombre, descripcion, nivelJerarquia, roleId]
  );
  return rows[0] || null;
};

module.exports = {
  getClient,
  listRoles,
  listRolesWithPermissions,
  getRoleById,
  getRoleWithPermissionsById,
  getRoleByCodigo,
  getRoleByNombre,
  createRole,
  updateRole
};
