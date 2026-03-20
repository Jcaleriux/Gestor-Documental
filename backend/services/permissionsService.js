const rolesPermisosRepo = require('../repositories/rolesPermisosRepository');
const { PERMISSIONS } = require('../domain/permissions');
const { runtimeConfig } = require('../config/runtime');

const normalizeRoleId = (roleId) => {
  const normalized = Number(roleId);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

const normalizePermissionList = (permissionNames) => {
  if (!Array.isArray(permissionNames)) return [];
  return [...new Set(permissionNames.filter(Boolean).map((permission) => String(permission).trim()))];
};

const createPermissionsService = ({
  repository = rolesPermisosRepo,
  cacheTtlMs = runtimeConfig.permissionsCacheTtlMs
} = {}) => {
  if (!repository || typeof repository.getPermissionNamesByRolId !== 'function') {
    throw new Error('repository.getPermissionNamesByRolId requerido');
  }

  const cache = new Map();

  const readFromCache = (roleId) => {
    const entry = cache.get(roleId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      cache.delete(roleId);
      return null;
    }
    return entry.permissions;
  };

  const writeToCache = (roleId, permissionNames) => {
    const normalized = normalizePermissionList(permissionNames);
    const permissions = Object.freeze(normalized);
    cache.set(roleId, {
      permissions,
      expiresAt: Date.now() + cacheTtlMs
    });
    return permissions;
  };

  const listPermissionsByRole = async (roleId) => {
    const normalizedRoleId = normalizeRoleId(roleId);
    if (!normalizedRoleId) {
      return [];
    }

    const cached = readFromCache(normalizedRoleId);
    if (cached) {
      return cached;
    }

    const rows = await repository.getPermissionNamesByRolId(normalizedRoleId);
    return writeToCache(normalizedRoleId, rows);
  };

  const invalidateRole = (roleId) => {
    const normalizedRoleId = normalizeRoleId(roleId);
    if (!normalizedRoleId) return;
    cache.delete(normalizedRoleId);
  };

  const hasAccesoTotal = (permissionNames) => normalizePermissionList(permissionNames).includes(PERMISSIONS.ACCESO_TOTAL);

  const hasPermission = (permissionNames, requiredPermission) => {
    const normalized = normalizePermissionList(permissionNames);
    if (!requiredPermission) return false;
    if (normalized.includes(PERMISSIONS.ACCESO_TOTAL)) return true;
    return normalized.includes(requiredPermission);
  };

  const hasAnyPermission = (permissionNames, requiredPermissions) => {
    const normalized = normalizePermissionList(permissionNames);
    const required = normalizePermissionList(requiredPermissions);
    if (required.length === 0) return true;
    if (normalized.includes(PERMISSIONS.ACCESO_TOTAL)) return true;
    return required.some((permission) => normalized.includes(permission));
  };

  const hasAllPermissions = (permissionNames, requiredPermissions) => {
    const normalized = normalizePermissionList(permissionNames);
    const required = normalizePermissionList(requiredPermissions);
    if (required.length === 0) return true;
    if (normalized.includes(PERMISSIONS.ACCESO_TOTAL)) return true;
    return required.every((permission) => normalized.includes(permission));
  };

  return {
    listPermissionsByRole,
    invalidateRole,
    hasAccesoTotal,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    normalizePermissionList
  };
};

const permissionsService = createPermissionsService();

module.exports = {
  createPermissionsService,
  permissionsService
};
