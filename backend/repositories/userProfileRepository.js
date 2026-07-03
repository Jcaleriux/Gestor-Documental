const pool = require('../db');

const getDb = (client) => client || pool;

const getClient = () => pool.connect();

const getPreferencesByUserId = async (userId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT usuario_id, theme_mode, creado_en, actualizado_en
     FROM usuarios_preferencias
     WHERE usuario_id = $1`,
    [userId]
  );

  return rows[0] || null;
};

const upsertPreferences = async ({ userId, themeMode }, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO usuarios_preferencias (usuario_id, theme_mode)
     VALUES ($1, $2)
     ON CONFLICT (usuario_id)
     DO UPDATE SET
       theme_mode = EXCLUDED.theme_mode,
       actualizado_en = CURRENT_TIMESTAMP
     RETURNING usuario_id, theme_mode, creado_en, actualizado_en`,
    [userId, themeMode]
  );

  return rows[0] || null;
};

const getAvatarByUserId = async (userId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       usuario_id,
       nombre_archivo,
       ruta_archivo,
       mime_type,
       tamanio_bytes,
       hash_sha256,
       creado_en,
       actualizado_en
     FROM usuarios_avatar
     WHERE usuario_id = $1`,
    [userId]
  );

  return rows[0] || null;
};

const upsertAvatar = async ({
  userId,
  nombreArchivo,
  rutaArchivo,
  mimeType,
  tamanioBytes,
  hashSha256,
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO usuarios_avatar (
       usuario_id,
       nombre_archivo,
       ruta_archivo,
       mime_type,
       tamanio_bytes,
       hash_sha256
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (usuario_id)
     DO UPDATE SET
       nombre_archivo = EXCLUDED.nombre_archivo,
       ruta_archivo = EXCLUDED.ruta_archivo,
       mime_type = EXCLUDED.mime_type,
       tamanio_bytes = EXCLUDED.tamanio_bytes,
       hash_sha256 = EXCLUDED.hash_sha256,
       actualizado_en = CURRENT_TIMESTAMP
     RETURNING
       usuario_id,
       nombre_archivo,
       ruta_archivo,
       mime_type,
       tamanio_bytes,
       hash_sha256,
       creado_en,
       actualizado_en`,
    [userId, nombreArchivo, rutaArchivo, mimeType, tamanioBytes, hashSha256]
  );

  return rows[0] || null;
};

const deleteAvatarByUserId = async (userId, client) => {
  const { rows } = await getDb(client).query(
    `DELETE FROM usuarios_avatar
     WHERE usuario_id = $1
     RETURNING
       usuario_id,
       nombre_archivo,
       ruta_archivo,
       mime_type,
       tamanio_bytes,
       hash_sha256,
       creado_en,
       actualizado_en`,
    [userId]
  );

  return rows[0] || null;
};

const insertProfileHistory = async ({
  usuarioId,
  actorUsuarioId,
  actorEmail,
  accion,
  detalles,
}, client) => {
  const { rows } = await getDb(client).query(
    `INSERT INTO usuarios_perfil_historial (
       usuario_id,
       actor_usuario_id,
       actor_email,
       accion,
       detalles
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, usuario_id, actor_usuario_id, actor_email, accion, detalles, creado_en`,
    [
      usuarioId,
      actorUsuarioId || null,
      actorEmail || null,
      accion,
      detalles ? JSON.stringify(detalles) : null,
    ]
  );

  return rows[0] || null;
};

module.exports = {
  deleteAvatarByUserId,
  getAvatarByUserId,
  getClient,
  getPreferencesByUserId,
  insertProfileHistory,
  upsertAvatar,
  upsertPreferences,
};
