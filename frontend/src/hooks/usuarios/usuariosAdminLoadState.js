const PERMISOS_LOAD_ERROR = 'No se pudo cargar el catalogo de permisos. Actualiza o reinicia el backend para administrar roles y permisos.';
const DEFAULT_LOAD_ERROR = 'No se pudo cargar la administracion de usuarios.';

const getResultError = (result) => {
  if (result?.status === 'rejected') {
    return result.reason?.response?.data?.error
      || result.reason?.response?.data?.message
      || result.reason?.message
      || DEFAULT_LOAD_ERROR;
  }

  return result?.value?.data?.error
    || result?.value?.data?.message
    || DEFAULT_LOAD_ERROR;
};

const getResultData = (result) => {
  if (result?.status !== 'fulfilled' || result.value?.data?.success !== true) {
    return {
      ok: false,
      data: [],
      error: getResultError(result)
    };
  }

  return {
    ok: true,
    data: Array.isArray(result.value.data.data) ? result.value.data.data : [],
    error: ''
  };
};

export const buildUsuariosAdminLoadState = ({
  usersResult,
  rolesResult,
  permisosResult,
  sociedadesResult
}) => {
  const users = getResultData(usersResult);
  const roles = getResultData(rolesResult);
  const permisos = getResultData(permisosResult);
  const sociedades = getResultData(sociedadesResult);
  const criticalError = [users, roles].find((entry) => !entry.ok)?.error || '';
  const optionalError = [
    permisos.ok ? null : PERMISOS_LOAD_ERROR,
    sociedades.ok ? null : sociedades.error
  ].find(Boolean) || '';

  return {
    usuarios: users.ok ? users.data : null,
    roles: roles.ok ? roles.data : null,
    permisos: permisos.ok ? permisos.data : null,
    sociedades: sociedades.ok ? sociedades.data : null,
    error: criticalError || optionalError
  };
};

export {
  PERMISOS_LOAD_ERROR
};
