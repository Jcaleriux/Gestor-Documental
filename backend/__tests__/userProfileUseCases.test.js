const { createUserProfileUseCases } = require('../services/userProfileUseCases');

const createClient = () => ({
  query: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
});

const createDeps = (overrides = {}) => ({
  profileRepo: {
    getClient: jest.fn(),
    getPreferencesByUserId: jest.fn(),
    upsertPreferences: jest.fn(),
    getAvatarByUserId: jest.fn(),
    upsertAvatar: jest.fn(),
    deleteAvatarByUserId: jest.fn(),
    insertProfileHistory: jest.fn(),
  },
  usuariosRepo: {
    getUsuarioById: jest.fn(),
  },
  storage: {
    writeAvatar: jest.fn(),
    resolveAvatarPath: jest.fn(),
    removeStoredAvatar: jest.fn(),
  },
  ...overrides,
});

describe('userProfileUseCases', () => {
  test('getOwnProfile devuelve preferencias por defecto y avatar vacio', async () => {
    const deps = createDeps();
    deps.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 7 });
    deps.profileRepo.getPreferencesByUserId.mockResolvedValue(null);
    deps.profileRepo.getAvatarByUserId.mockResolvedValue(null);
    const useCases = createUserProfileUseCases(deps);

    await expect(useCases.getOwnProfile({
      user: { id: 7, email: 'ana@empresa.test' },
    })).resolves.toEqual({
      preferencias: { theme_mode: 'light' },
      avatar: {
        has_avatar: false,
        url: null,
        nombre_archivo: null,
        mime_type: null,
        tamanio_bytes: null,
        actualizado_en: null,
      },
    });

    expect(deps.usuariosRepo.getUsuarioById).toHaveBeenCalledWith(7, undefined);
    expect(deps.profileRepo.getPreferencesByUserId).toHaveBeenCalledWith(7);
    expect(deps.profileRepo.getAvatarByUserId).toHaveBeenCalledWith(7);
  });

  test('updateOwnPreferences guarda tema dentro de transaccion e historiza', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.profileRepo.getClient.mockResolvedValue(client);
    deps.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 8 });
    deps.profileRepo.upsertPreferences.mockResolvedValue({
      usuario_id: 8,
      theme_mode: 'dark',
    });
    const useCases = createUserProfileUseCases(deps);

    const result = await useCases.updateOwnPreferences({
      user: { id: 8, email: 'conta@empresa.test' },
      theme_mode: 'dark',
    });

    expect(result).toEqual({
      preferencias: { theme_mode: 'dark' },
    });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(deps.profileRepo.upsertPreferences).toHaveBeenCalledWith({
      userId: 8,
      themeMode: 'dark',
    }, client);
    expect(deps.profileRepo.insertProfileHistory).toHaveBeenCalledWith({
      usuarioId: 8,
      actorUsuarioId: 8,
      actorEmail: 'conta@empresa.test',
      accion: 'preferencias_actualizadas',
      detalles: { theme_mode: 'dark' },
    }, client);
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('updateOwnPreferences rechaza tema invalido', async () => {
    const deps = createDeps();
    const useCases = createUserProfileUseCases(deps);

    await expect(useCases.updateOwnPreferences({
      user: { id: 8 },
      theme_mode: 'sepia',
    })).rejects.toMatchObject({
      status: 400,
      message: 'theme_mode invalido',
    });

    expect(deps.profileRepo.upsertPreferences).not.toHaveBeenCalled();
  });

  test('uploadOwnAvatar reemplaza metadatos y elimina archivo anterior despues del commit', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.profileRepo.getClient.mockResolvedValue(client);
    deps.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 9 });
    deps.storage.writeAvatar.mockReturnValue({
      nombreArchivo: 'avatar-1.png',
      rutaArchivo: 'perfiles/avatares/9/avatar-1.png',
      mimeType: 'image/png',
      tamanioBytes: 120,
      hashSha256: 'hash-nuevo',
    });
    deps.profileRepo.getAvatarByUserId.mockResolvedValue({
      usuario_id: 9,
      nombre_archivo: 'avatar-viejo.png',
      ruta_archivo: 'perfiles/avatares/9/avatar-viejo.png',
    });
    deps.profileRepo.upsertAvatar.mockResolvedValue({
      usuario_id: 9,
      nombre_archivo: 'avatar-1.png',
      mime_type: 'image/png',
      tamanio_bytes: 120,
      actualizado_en: '2026-07-02',
    });
    const useCases = createUserProfileUseCases(deps);

    const result = await useCases.uploadOwnAvatar({
      user: { id: 9, email: 'ventas@empresa.test' },
      filename: 'perfil.png',
      file_base64: 'data:image/png;base64,abc=',
      mime_type: 'image/png',
    });

    expect(result).toEqual({
      avatar: {
        has_avatar: true,
        url: '/api/me/avatar',
        nombre_archivo: 'avatar-1.png',
        mime_type: 'image/png',
        tamanio_bytes: 120,
        actualizado_en: '2026-07-02',
      },
    });
    expect(deps.storage.writeAvatar).toHaveBeenCalledWith({
      userId: 9,
      fileBase64: 'data:image/png;base64,abc=',
      fileName: 'perfil.png',
      mimeType: 'image/png',
    });
    expect(deps.profileRepo.upsertAvatar).toHaveBeenCalledWith({
      userId: 9,
      nombreArchivo: 'avatar-1.png',
      rutaArchivo: 'perfiles/avatares/9/avatar-1.png',
      mimeType: 'image/png',
      tamanioBytes: 120,
      hashSha256: 'hash-nuevo',
    }, client);
    expect(deps.storage.removeStoredAvatar).toHaveBeenCalledWith('perfiles/avatares/9/avatar-viejo.png');
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
  });

  test('uploadOwnAvatar elimina archivo nuevo si falla la transaccion', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.profileRepo.getClient.mockResolvedValue(client);
    deps.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 10 });
    deps.storage.writeAvatar.mockReturnValue({
      nombreArchivo: 'avatar-2.png',
      rutaArchivo: 'perfiles/avatares/10/avatar-2.png',
      mimeType: 'image/png',
      tamanioBytes: 130,
      hashSha256: 'hash-nuevo',
    });
    deps.profileRepo.getAvatarByUserId.mockResolvedValue(null);
    deps.profileRepo.upsertAvatar.mockRejectedValue(new Error('db down'));
    const useCases = createUserProfileUseCases(deps);

    await expect(useCases.uploadOwnAvatar({
      user: { id: 10 },
      filename: 'perfil.png',
      file_base64: 'data:image/png;base64,abc=',
      mime_type: 'image/png',
    })).rejects.toThrow('db down');

    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(deps.storage.removeStoredAvatar).toHaveBeenCalledWith('perfiles/avatares/10/avatar-2.png');
  });

  test('deleteUsuarioAvatar valida usuario, historiza y elimina archivo si existia', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.profileRepo.getClient.mockResolvedValue(client);
    deps.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 12 });
    deps.profileRepo.deleteAvatarByUserId.mockResolvedValue({
      usuario_id: 12,
      nombre_archivo: 'avatar.png',
      ruta_archivo: 'perfiles/avatares/12/avatar.png',
    });
    const useCases = createUserProfileUseCases(deps);

    const result = await useCases.deleteUsuarioAvatar({
      actor: { id: 1, email: 'admin@empresa.test' },
      userId: '12',
    });

    expect(result.avatar.has_avatar).toBe(false);
    expect(deps.profileRepo.insertProfileHistory).toHaveBeenCalledWith({
      usuarioId: 12,
      actorUsuarioId: 1,
      actorEmail: 'admin@empresa.test',
      accion: 'avatar_eliminado_admin',
      detalles: {
        anterior_nombre_archivo: 'avatar.png',
      },
    }, client);
    expect(deps.storage.removeStoredAvatar).toHaveBeenCalledWith('perfiles/avatares/12/avatar.png');
  });
});
