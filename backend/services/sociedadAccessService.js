const { createError } = require('../utils/errors');
const { PERMISSIONS } = require('../domain/permissions');
const { permissionsService } = require('./permissionsService');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const toPositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const ensureSociedadAccess = async ({ user, sociedadId }) => {
  const normalizedSociedadId = toPositiveInt(sociedadId, 'sociedad_id');
  const permissions = permissionsService.normalizePermissionList(user?.permissions);

  if (
    permissions.includes(PERMISSIONS.ACCESO_TOTAL)
    || permissions.includes(PERMISSIONS.SOCIEDADES_TODAS)
  ) {
    return normalizedSociedadId;
  }

  if (permissions.includes(PERMISSIONS.SOCIEDADES_ASIGNADAS)) {
    const assigned = await usuariosSociedadesRepo.listSociedadIdsByUsuarioId(user?.id);
    if (assigned.includes(normalizedSociedadId)) {
      return normalizedSociedadId;
    }
  }

  throw createError(403, 'No tiene acceso a la sociedad solicitada');
};

const resolveSociedadAccessScope = async ({ user, sociedadId, fieldName = 'sociedadId' } = {}) => {
  const normalizedSociedadId = (
    sociedadId === undefined || sociedadId === null || sociedadId === ''
      ? null
      : toPositiveInt(sociedadId, fieldName)
  );
  const permissions = permissionsService.normalizePermissionList(user?.permissions);

  if (
    permissions.includes(PERMISSIONS.ACCESO_TOTAL)
    || permissions.includes(PERMISSIONS.SOCIEDADES_TODAS)
  ) {
    return normalizedSociedadId
      ? { sociedadId: normalizedSociedadId }
      : {};
  }

  if (permissions.includes(PERMISSIONS.SOCIEDADES_ASIGNADAS)) {
    const assigned = await usuariosSociedadesRepo.listSociedadIdsByUsuarioId(user?.id);
    const assignedIds = [...new Set(
      (assigned || [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];

    if (normalizedSociedadId) {
      if (assignedIds.includes(normalizedSociedadId)) {
        return { sociedadId: normalizedSociedadId };
      }
      throw createError(403, 'No tiene acceso a la sociedad solicitada');
    }

    return { sociedadIds: assignedIds };
  }

  throw createError(403, 'No tiene acceso a sociedades');
};

module.exports = {
  ensureSociedadAccess,
  resolveSociedadAccessScope,
  toPositiveInt
};
