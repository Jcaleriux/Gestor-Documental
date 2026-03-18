const pool = require('../db');

const getDb = (client) => client || pool;
const USER_PUBLIC_SELECT = `
  u.id,
  u.nombre,
  u.email,
  u.rol_id as rol,
  u.rol_id as rol_id,
  r.codigo as rol_codigo,
  r.nombre as rol_nombre,
  u.activo,
  u.creado_en,
  u.actualizado_en
`;

const getByEmail = async (email, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
      u.id,
      u.nombre,
      u.email,
      u.rol_id as rol,
      u.rol_id as rol_id,
      r.codigo as rol_codigo,
      r.nombre as rol_nombre,
      u.activo,
      u.password
    FROM usuarios u
    LEFT JOIN roles r ON r.id = u.rol_id
    WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
};

const updatePassword = async (userId, passwordHash, client) => {
  await getDb(client).query(
    'UPDATE usuarios SET password = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, userId]
  );
};

const listUsuarios = async (client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${USER_PUBLIC_SELECT}
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     ORDER BY u.creado_en DESC`
  );
  return rows;
};

const getUsuarioById = async (userId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT ${USER_PUBLIC_SELECT}
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
};

const createUsuario = async ({
  nombre,
  email,
  passwordHash,
  rolId,
  activo = true
}, client) => {
  const db = getDb(client);
  const { rows } = await db.query(
    `INSERT INTO usuarios (email, nombre, password, rol_id, activo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [email, nombre, passwordHash, rolId, activo]
  );

  if (!rows[0]) {
    return null;
  }

  return getUsuarioById(rows[0].id, client);
};

const updateUsuario = async ({
  userId,
  nombre,
  email,
  rolId,
  activo
}, client) => {
  const { rows } = await getDb(client).query(
    `UPDATE usuarios
     SET nombre = $1,
         email = $2,
         rol_id = $3,
         activo = $4,
         actualizado_en = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id`,
    [nombre, email, rolId, activo, userId]
  );

  if (!rows[0]) {
    return null;
  }

  return getUsuarioById(rows[0].id, client);
};

module.exports = {
  getByEmail,
  updatePassword,
  listUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario
};
