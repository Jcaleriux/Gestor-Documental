const bcrypt = require('bcrypt');
const { BCRYPT_ROUNDS } = require('../config/auth');
const { createError } = require('../utils/errors');
const { withTransaction } = require('../db/withTransaction');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeName = (name) => String(name || '').trim();
const normalizeBoolean = (value, fallback = true) => (
  typeof value === 'boolean' ? value : fallback
);

const toPositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const toUniquePositiveIntList = (values, fieldName) => {
  if (!Array.isArray(values)) {
    throw createError(400, `${fieldName} invalido`);
  }
  const normalized = [...new Set(values.map((value) => toPositiveInt(value, fieldName)))];
  return normalized;
};

const createUsuariosUseCases = ({
  usuariosRepo,
  rolesRepo,
  sociedadesRepo,
  usuariosSociedadesRepo
}) => {
  if (!usuariosRepo) {
    throw new Error('usuariosRepo requerido');
  }
  if (!rolesRepo) {
    throw new Error('rolesRepo requerido');
  }
  if (!sociedadesRepo) {
    throw new Error('sociedadesRepo requerido');
  }
  if (!usuariosSociedadesRepo) {
    throw new Error('usuariosSociedadesRepo requerido');
  }

  const listUsuarios = async () => {
    return usuariosRepo.listUsuarios();
  };

  const listRoles = async () => {
    return rolesRepo.listRoles();
  };

  const ensureRoleExists = async (rolId) => {
    const role = await rolesRepo.getRoleById(rolId);
    if (!role) {
      throw createError(400, 'rol_id invalido');
    }
  };

  const ensureEmailAvailable = async (email, excludeUserId = null) => {
    const existing = await usuariosRepo.getByEmail(email);
    if (!existing) {
      return;
    }

    if (excludeUserId && Number(existing.id) === Number(excludeUserId)) {
      return;
    }

    throw createError(409, 'Ya existe un usuario con ese email');
  };

  const ensureUsuarioExists = async (userId, client) => {
    const user = await usuariosRepo.getUsuarioById(userId, client);
    if (!user) {
      throw createError(404, 'Usuario no encontrado');
    }
    return user;
  };

  const createUsuario = async ({
    nombre,
    email,
    password,
    rol_id,
    activo
  }) => {
    const normalizedName = normalizeName(nombre);
    const normalizedEmail = normalizeEmail(email);
    const normalizedRolId = toPositiveInt(rol_id, 'rol_id');
    const normalizedActivo = normalizeBoolean(activo, true);

    await ensureRoleExists(normalizedRolId);
    await ensureEmailAvailable(normalizedEmail);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    return usuariosRepo.createUsuario({
      nombre: normalizedName,
      email: normalizedEmail,
      passwordHash,
      rolId: normalizedRolId,
      activo: normalizedActivo
    });
  };

  const updateUsuario = async ({
    id,
    nombre,
    email,
    rol_id,
    activo,
    password
  }) => {
    const userId = toPositiveInt(id, 'id');
    const normalizedName = normalizeName(nombre);
    const normalizedEmail = normalizeEmail(email);
    const normalizedRolId = toPositiveInt(rol_id, 'rol_id');
    const normalizedActivo = normalizeBoolean(activo, true);

    const current = await usuariosRepo.getUsuarioById(userId);
    if (!current) {
      throw createError(404, 'Usuario no encontrado');
    }

    await ensureRoleExists(normalizedRolId);
    await ensureEmailAvailable(normalizedEmail, userId);

    const updated = await usuariosRepo.updateUsuario({
      userId,
      nombre: normalizedName,
      email: normalizedEmail,
      rolId: normalizedRolId,
      activo: normalizedActivo
    });

    const passwordValue = typeof password === 'string' ? password.trim() : '';
    if (passwordValue) {
      const passwordHash = await bcrypt.hash(passwordValue, BCRYPT_ROUNDS);
      await usuariosRepo.updatePassword(userId, passwordHash);
      return usuariosRepo.getUsuarioById(userId);
    }

    return updated;
  };

  const listSociedadesUsuario = async ({ userId }) => {
    const normalizedUserId = toPositiveInt(userId, 'id');
    await ensureUsuarioExists(normalizedUserId);

    const sociedades = await usuariosSociedadesRepo.listSociedadesByUsuarioId(normalizedUserId);
    const sociedadIds = await usuariosSociedadesRepo.listSociedadIdsByUsuarioId(normalizedUserId);

    return {
      usuario_id: normalizedUserId,
      sociedad_ids: sociedadIds,
      sociedades
    };
  };

  const setSociedadesUsuario = async ({ userId, sociedad_ids }) => {
    const normalizedUserId = toPositiveInt(userId, 'id');
    const sociedadIds = toUniquePositiveIntList(sociedad_ids || [], 'sociedad_ids');

    return withTransaction(
      () => usuariosSociedadesRepo.getClient(),
      async (client) => {
        await ensureUsuarioExists(normalizedUserId, client);

        if (sociedadIds.length > 0) {
          const sociedades = await sociedadesRepo.listSociedadesByIds(sociedadIds, client);
          if (sociedades.length !== sociedadIds.length) {
            throw createError(400, 'Una o mas sociedades no existen');
          }
        }

        await usuariosSociedadesRepo.replaceSociedadesByUsuarioId({
          usuarioId: normalizedUserId,
          sociedadIds
        }, client);

        const sociedades = await usuariosSociedadesRepo.listSociedadesByUsuarioId(normalizedUserId, client);
        return {
          usuario_id: normalizedUserId,
          sociedad_ids: sociedades.map((sociedad) => sociedad.id),
          sociedades
        };
      }
    );
  };

  return {
    listUsuarios,
    listRoles,
    createUsuario,
    updateUsuario,
    listSociedadesUsuario,
    setSociedadesUsuario
  };
};

module.exports = { createUsuariosUseCases };
