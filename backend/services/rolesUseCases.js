const { withTransaction } = require('../db/withTransaction');
const { PERMISSIONS } = require('../domain/permissions');
const { createError } = require('../utils/errors');
const { permissionsService: defaultPermissionsService } = require('./permissionsService');

const ADMIN_ROLE_CODE = 'admin';
const REQUIRED_ADMIN_PERMISSIONS = Object.freeze([
  PERMISSIONS.ACCESO_TOTAL,
  PERMISSIONS.USUARIOS_ADMINISTRAR
]);

const normalizeRoleCode = (value) => String(value || '').trim().toLowerCase();
const normalizeText = (value) => String(value || '').trim();
const normalizeNullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};

const toPositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const toHierarchyLevel = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw createError(400, 'nivel_jerarquia invalido');
  }
  return parsed;
};

const createRoleDto = (role) => {
  if (!role) {
    return null;
  }

  return {
    ...role,
    permisos: Array.isArray(role.permisos) ? role.permisos : []
  };
};

const createRolesUseCases = ({
  rolesRepo,
  rolesPermisosRepo,
  permissionsService = defaultPermissionsService,
  runInTransaction = withTransaction
}) => {
  if (!rolesRepo) {
    throw new Error('rolesRepo requerido');
  }
  if (!rolesPermisosRepo) {
    throw new Error('rolesPermisosRepo requerido');
  }
  if (!permissionsService) {
    throw new Error('permissionsService requerido');
  }

  const normalizePermissionNames = (permissionNames) => {
    if (!Array.isArray(permissionNames)) {
      throw createError(400, 'permisos invalido');
    }
    return permissionsService.normalizePermissionList(permissionNames);
  };

  const ensureRoleExists = async (roleId, client) => {
    const role = await rolesRepo.getRoleById(roleId, client);
    if (!role) {
      throw createError(404, 'Rol no encontrado');
    }
    return role;
  };

  const ensureRoleNameAvailable = async ({ nombre, roleId = null, client }) => {
    const existing = await rolesRepo.getRoleByNombre(nombre, client);
    if (!existing || (roleId && Number(existing.id) === Number(roleId))) {
      return;
    }
    throw createError(409, 'Ya existe un rol con ese nombre');
  };

  const ensureRoleCodeAvailable = async ({ codigo, client }) => {
    const existing = await rolesRepo.getRoleByCodigo(codigo, client);
    if (existing) {
      throw createError(409, 'Ya existe un rol con ese codigo');
    }
  };

  const resolvePermissionIds = async (permissionNames, client) => {
    const permisos = await rolesPermisosRepo.listPermisosByNames(permissionNames, client);
    const foundNames = new Set(permisos.map((permission) => permission.nombre));
    const missing = permissionNames.filter((permission) => !foundNames.has(permission));

    if (missing.length > 0) {
      throw createError(400, 'Uno o mas permisos no existen', { permisos: missing });
    }

    return permisos.map((permission) => permission.id);
  };

  const ensureAdminRoleSafety = (role, permissionNames) => {
    if (role?.codigo !== ADMIN_ROLE_CODE) {
      return;
    }

    const permissionSet = new Set(permissionNames);
    const missing = REQUIRED_ADMIN_PERMISSIONS.filter((permission) => !permissionSet.has(permission));
    if (missing.length > 0) {
      throw createError(400, 'El rol admin debe conservar acceso total y administracion de usuarios', {
        permisos_requeridos: REQUIRED_ADMIN_PERMISSIONS
      });
    }
  };

  const replaceRolePermissions = async ({ role, permissionNames, client }) => {
    ensureAdminRoleSafety(role, permissionNames);
    const permissionIds = await resolvePermissionIds(permissionNames, client);
    await rolesPermisosRepo.replaceRolePermissions({
      roleId: role.id,
      permissionIds
    }, client);
    permissionsService.invalidateRole(role.id);
  };

  const listRoles = async () => {
    const roles = await rolesRepo.listRolesWithPermissions();
    return roles.map(createRoleDto);
  };

  const listPermisos = async () => {
    return rolesPermisosRepo.listPermisos();
  };

  const createRole = async ({
    codigo,
    nombre,
    descripcion = null,
    nivel_jerarquia = 0,
    permisos = []
  }) => {
    const normalizedCode = normalizeRoleCode(codigo);
    const normalizedName = normalizeText(nombre);
    const normalizedDescription = normalizeNullableText(descripcion);
    const normalizedHierarchy = toHierarchyLevel(nivel_jerarquia);
    const permissionNames = normalizePermissionNames(permisos);

    return runInTransaction(
      () => rolesRepo.getClient(),
      async (client) => {
        await ensureRoleCodeAvailable({ codigo: normalizedCode, client });
        await ensureRoleNameAvailable({ nombre: normalizedName, client });

        const role = await rolesRepo.createRole({
          codigo: normalizedCode,
          nombre: normalizedName,
          descripcion: normalizedDescription,
          nivelJerarquia: normalizedHierarchy
        }, client);

        await replaceRolePermissions({ role, permissionNames, client });
        return createRoleDto(await rolesRepo.getRoleWithPermissionsById(role.id, client));
      }
    );
  };

  const updateRole = async ({
    id,
    nombre,
    descripcion = null,
    nivel_jerarquia = 0,
    permisos
  }) => {
    const roleId = toPositiveInt(id, 'id');
    const normalizedName = normalizeText(nombre);
    const normalizedDescription = normalizeNullableText(descripcion);
    const normalizedHierarchy = toHierarchyLevel(nivel_jerarquia);
    const hasPermissionsPayload = permisos !== undefined;
    const permissionNames = hasPermissionsPayload ? normalizePermissionNames(permisos) : null;

    return runInTransaction(
      () => rolesRepo.getClient(),
      async (client) => {
        const current = await ensureRoleExists(roleId, client);
        await ensureRoleNameAvailable({ nombre: normalizedName, roleId, client });

        const updated = await rolesRepo.updateRole({
          roleId,
          nombre: normalizedName,
          descripcion: normalizedDescription,
          nivelJerarquia: normalizedHierarchy
        }, client);

        if (hasPermissionsPayload) {
          await replaceRolePermissions({ role: updated || current, permissionNames, client });
        }

        return createRoleDto(await rolesRepo.getRoleWithPermissionsById(roleId, client));
      }
    );
  };

  const setRolePermissions = async ({ id, permisos }) => {
    const roleId = toPositiveInt(id, 'id');
    const permissionNames = normalizePermissionNames(permisos);

    return runInTransaction(
      () => rolesRepo.getClient(),
      async (client) => {
        const role = await ensureRoleExists(roleId, client);
        await replaceRolePermissions({ role, permissionNames, client });
        return createRoleDto(await rolesRepo.getRoleWithPermissionsById(roleId, client));
      }
    );
  };

  return {
    listRoles,
    listPermisos,
    createRole,
    updateRole,
    setRolePermissions
  };
};

module.exports = {
  ADMIN_ROLE_CODE,
  REQUIRED_ADMIN_PERMISSIONS,
  createRolesUseCases
};
