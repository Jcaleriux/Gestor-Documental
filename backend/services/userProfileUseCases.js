const { createError } = require('../utils/errors');
const { withTransaction } = require('../db/withTransaction');

const VALID_THEME_MODES = new Set(['light', 'dark']);
const DEFAULT_PREFERENCES = Object.freeze({
  theme_mode: 'light',
});

const toPositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const normalizeThemeMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!VALID_THEME_MODES.has(normalized)) {
    throw createError(400, 'theme_mode invalido');
  }
  return normalized;
};

const getActor = (user) => ({
  actorUsuarioId: user?.id ? toPositiveInt(user.id, 'usuario_id') : null,
  actorEmail: user?.email || null,
});

const toPreferencesResponse = (preferences) => ({
  theme_mode: preferences?.theme_mode || DEFAULT_PREFERENCES.theme_mode,
});

const toAvatarResponse = (avatar) => {
  if (!avatar) {
    return {
      has_avatar: false,
      url: null,
      nombre_archivo: null,
      mime_type: null,
      tamanio_bytes: null,
      actualizado_en: null,
    };
  }

  return {
    has_avatar: true,
    url: '/api/me/avatar',
    nombre_archivo: avatar.nombre_archivo,
    mime_type: avatar.mime_type,
    tamanio_bytes: avatar.tamanio_bytes,
    actualizado_en: avatar.actualizado_en,
  };
};

const createUserProfileUseCases = ({
  profileRepo,
  usuariosRepo,
  storage,
}) => {
  if (!profileRepo) {
    throw new Error('profileRepo requerido');
  }
  if (!usuariosRepo) {
    throw new Error('usuariosRepo requerido');
  }
  if (!storage) {
    throw new Error('storage requerido');
  }

  const ensureUsuarioExists = async (userId, client) => {
    const user = await usuariosRepo.getUsuarioById(userId, client);
    if (!user) {
      throw createError(404, 'Usuario no encontrado');
    }
    return user;
  };

  const getOwnProfile = async ({ user }) => {
    const userId = toPositiveInt(user?.id, 'usuario_id');
    await ensureUsuarioExists(userId);

    const [preferences, avatar] = await Promise.all([
      profileRepo.getPreferencesByUserId(userId),
      profileRepo.getAvatarByUserId(userId),
    ]);

    return {
      preferencias: toPreferencesResponse(preferences),
      avatar: toAvatarResponse(avatar),
    };
  };

  const updateOwnPreferences = async ({ user, theme_mode }) => {
    const userId = toPositiveInt(user?.id, 'usuario_id');
    const themeMode = normalizeThemeMode(theme_mode);

    return withTransaction(
      () => profileRepo.getClient(),
      async (client) => {
        await ensureUsuarioExists(userId, client);
        const preferences = await profileRepo.upsertPreferences({
          userId,
          themeMode,
        }, client);
        await profileRepo.insertProfileHistory({
          usuarioId: userId,
          ...getActor(user),
          accion: 'preferencias_actualizadas',
          detalles: { theme_mode: themeMode },
        }, client);

        return {
          preferencias: toPreferencesResponse(preferences),
        };
      }
    );
  };

  const uploadOwnAvatar = async ({
    user,
    filename,
    file_base64,
    mime_type,
  }) => {
    const userId = toPositiveInt(user?.id, 'usuario_id');
    await ensureUsuarioExists(userId);

    const writtenAvatar = storage.writeAvatar({
      userId,
      fileBase64: file_base64,
      fileName: filename,
      mimeType: mime_type,
    });

    try {
      const result = await withTransaction(
        () => profileRepo.getClient(),
        async (client) => {
          const previousAvatar = await profileRepo.getAvatarByUserId(userId, client);
          const avatar = await profileRepo.upsertAvatar({
            userId,
            nombreArchivo: writtenAvatar.nombreArchivo,
            rutaArchivo: writtenAvatar.rutaArchivo,
            mimeType: writtenAvatar.mimeType,
            tamanioBytes: writtenAvatar.tamanioBytes,
            hashSha256: writtenAvatar.hashSha256,
          }, client);
          await profileRepo.insertProfileHistory({
            usuarioId: userId,
            ...getActor(user),
            accion: 'avatar_actualizado',
            detalles: {
              nombre_archivo: avatar.nombre_archivo,
              tamanio_bytes: avatar.tamanio_bytes,
              anterior_nombre_archivo: previousAvatar?.nombre_archivo || null,
            },
          }, client);

          return {
            avatar,
            previousAvatar,
          };
        }
      );

      if (result.previousAvatar?.ruta_archivo) {
        storage.removeStoredAvatar(result.previousAvatar.ruta_archivo);
      }

      return {
        avatar: toAvatarResponse(result.avatar),
      };
    } catch (error) {
      storage.removeStoredAvatar(writtenAvatar.rutaArchivo);
      throw error;
    }
  };

  const deleteAvatarForUser = async ({
    userId,
    actor,
    accion,
  }) => {
    const normalizedUserId = toPositiveInt(userId, 'usuario_id');

    const deletedAvatar = await withTransaction(
      () => profileRepo.getClient(),
      async (client) => {
        await ensureUsuarioExists(normalizedUserId, client);
        const avatar = await profileRepo.deleteAvatarByUserId(normalizedUserId, client);
        await profileRepo.insertProfileHistory({
          usuarioId: normalizedUserId,
          ...getActor(actor),
          accion,
          detalles: {
            anterior_nombre_archivo: avatar?.nombre_archivo || null,
          },
        }, client);
        return avatar;
      }
    );

    if (deletedAvatar?.ruta_archivo) {
      storage.removeStoredAvatar(deletedAvatar.ruta_archivo);
    }

    return {
      avatar: toAvatarResponse(null),
    };
  };

  const deleteOwnAvatar = async ({ user }) => {
    const userId = toPositiveInt(user?.id, 'usuario_id');
    return deleteAvatarForUser({
      userId,
      actor: user,
      accion: 'avatar_eliminado',
    });
  };

  const deleteUsuarioAvatar = async ({ actor, userId }) => {
    return deleteAvatarForUser({
      userId,
      actor,
      accion: 'avatar_eliminado_admin',
    });
  };

  const getOwnAvatarFile = async ({ user }) => {
    const userId = toPositiveInt(user?.id, 'usuario_id');
    await ensureUsuarioExists(userId);
    const avatar = await profileRepo.getAvatarByUserId(userId);
    if (!avatar) {
      throw createError(404, 'Avatar no encontrado');
    }

    return {
      avatar,
      fullPath: storage.resolveAvatarPath(avatar.ruta_archivo),
    };
  };

  return {
    deleteOwnAvatar,
    deleteUsuarioAvatar,
    getOwnAvatarFile,
    getOwnProfile,
    updateOwnPreferences,
    uploadOwnAvatar,
  };
};

module.exports = {
  DEFAULT_PREFERENCES,
  createUserProfileUseCases,
  toAvatarResponse,
  toPreferencesResponse,
};
