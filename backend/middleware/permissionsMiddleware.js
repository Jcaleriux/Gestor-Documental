const { createError } = require('../utils/errors');
const { permissionsService } = require('../services/permissionsService');

const roleFromRequest = (req) => req?.user?.rol;

const normalizeRequiredPermissions = (requiredPermissions) => (
  permissionsService.normalizePermissionList(requiredPermissions)
);

const ensureAuthenticatedUser = (req) => {
  if (!req || !req.user) {
    throw createError(401, 'Token requerido');
  }
};

const loadUserPermissions = async (req, res, next) => {
  try {
    ensureAuthenticatedUser(req);

    if (Array.isArray(req.user.permissions)) {
      return next();
    }

    const permissions = await permissionsService.listPermissionsByRole(roleFromRequest(req));
    req.user.permissions = permissions;
    return next();
  } catch (error) {
    return next(error);
  }
};

const ensurePermission = (req, requiredPermissions, checkFn, errorMessage) => {
  ensureAuthenticatedUser(req);
  const required = normalizeRequiredPermissions(requiredPermissions);
  if (required.length === 0) {
    return true;
  }

  const userPermissions = permissionsService.normalizePermissionList(req.user.permissions);
  const allowed = checkFn(userPermissions, required);
  if (!allowed) {
    throw createError(403, errorMessage(required));
  }

  return true;
};

const requirePermission = (permission) => {
  const requiredPermissions = normalizeRequiredPermissions([permission]);
  return (req, res, next) => {
    try {
      ensurePermission(
        req,
        requiredPermissions,
        (userPermissions, required) => permissionsService.hasPermission(userPermissions, required[0]),
        (required) => `Permiso requerido: ${required[0]}`
      );
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const requireAnyPermission = (permissions) => {
  const requiredPermissions = normalizeRequiredPermissions(permissions);
  return (req, res, next) => {
    try {
      ensurePermission(
        req,
        requiredPermissions,
        (userPermissions, required) => permissionsService.hasAnyPermission(userPermissions, required),
        (required) => `Requiere alguno de estos permisos: ${required.join(', ')}`
      );
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const requireAllPermissions = (permissions) => {
  const requiredPermissions = normalizeRequiredPermissions(permissions);
  return (req, res, next) => {
    try {
      ensurePermission(
        req,
        requiredPermissions,
        (userPermissions, required) => permissionsService.hasAllPermissions(userPermissions, required),
        (required) => `Requiere todos estos permisos: ${required.join(', ')}`
      );
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  loadUserPermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions
};
