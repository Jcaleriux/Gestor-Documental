const { PERMISSIONS } = require('../domain/permissions');
const { permissionsService } = require('./permissionsService');

const createSociedadesUseCases = ({ sociedadesRepo, usuariosSociedadesRepo }) => {
  if (!sociedadesRepo) {
    throw new Error('sociedadesRepo requerido');
  }
  if (!usuariosSociedadesRepo) {
    throw new Error('usuariosSociedadesRepo requerido');
  }

  const listSociedades = async ({ user }) => {
    const userPermissions = permissionsService.normalizePermissionList(user?.permissions);

    if (
      userPermissions.includes(PERMISSIONS.ACCESO_TOTAL)
      || userPermissions.includes(PERMISSIONS.SOCIEDADES_TODAS)
    ) {
      return sociedadesRepo.listSociedades();
    }

    if (userPermissions.includes(PERMISSIONS.SOCIEDADES_ASIGNADAS)) {
      return usuariosSociedadesRepo.listSociedadesByUsuarioId(user?.id);
    }

    return [];
  };

  return { listSociedades };
};

module.exports = { createSociedadesUseCases };
