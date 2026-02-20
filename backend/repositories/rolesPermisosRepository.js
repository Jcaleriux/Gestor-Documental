const pool = require('../db');

const getPermissionNamesByRolId = async (rolId, client) => {
  const db = client || pool;
  const { rows } = await db.query(
    `SELECT p.nombre
     FROM roles_permisos rp
     INNER JOIN permisos p ON p.id = rp.permiso_id
     WHERE rp.rol_id = $1
     ORDER BY p.nombre ASC`,
    [rolId]
  );

  return rows.map((row) => row.nombre);
};

module.exports = {
  getPermissionNamesByRolId
};
