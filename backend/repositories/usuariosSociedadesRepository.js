const pool = require('../db');

const getDb = (client) => client || pool;
const getClient = () => pool.connect();

const listSociedadesByUsuarioId = async (usuarioId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
      s.id,
      s.codigo,
      s.nombre_proyecto,
      s.razon_social,
      s.cedula_juridica,
      s.activo
     FROM usuarios_sociedades us
     INNER JOIN sociedades s ON s.id = us.sociedad_id
     WHERE us.usuario_id = $1
       AND s.activo = true
     ORDER BY s.nombre_proyecto NULLS LAST, s.razon_social`,
    [usuarioId]
  );

  return rows;
};

const listSociedadIdsByUsuarioId = async (usuarioId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT sociedad_id
     FROM usuarios_sociedades
     WHERE usuario_id = $1
     ORDER BY sociedad_id ASC`,
    [usuarioId]
  );
  return rows.map((row) => row.sociedad_id);
};

const replaceSociedadesByUsuarioId = async ({ usuarioId, sociedadIds }, client) => {
  await getDb(client).query(
    'DELETE FROM usuarios_sociedades WHERE usuario_id = $1',
    [usuarioId]
  );

  if (!Array.isArray(sociedadIds) || sociedadIds.length === 0) {
    return;
  }

  await getDb(client).query(
    `INSERT INTO usuarios_sociedades (usuario_id, sociedad_id)
     SELECT $1, x.sociedad_id
     FROM unnest($2::int[]) AS x(sociedad_id)
     ON CONFLICT (usuario_id, sociedad_id) DO NOTHING`,
    [usuarioId, sociedadIds]
  );
};

module.exports = {
  getClient,
  listSociedadesByUsuarioId,
  listSociedadIdsByUsuarioId,
  replaceSociedadesByUsuarioId
};
