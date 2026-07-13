const express = require('express');
const {
  listUsuarios,
  createUsuario,
  updateUsuario,
  listSociedadesUsuario,
  setSociedadesUsuario
} = require('../services/usuariosService');
const {
  listRoles,
  listPermisos,
  createRole,
  updateRole,
  setRolePermissions
} = require('../services/rolesService');
const { deleteUsuarioAvatar } = require('../services/userProfileService');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const {
  createUsuarioSchema,
  updateUsuarioSchema,
  setUsuarioSociedadesSchema,
  createRoleSchema,
  updateRoleSchema,
  setRolePermissionsSchema
} = require('../validation/schemas');

const router = express.Router({ mergeParams: true });

router.get('/usuarios', requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR), listUsuarios);
router.get('/roles', requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR), listRoles);
router.get('/permisos', requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR), listPermisos);
router.post(
  '/roles',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(createRoleSchema, { message: 'Datos de rol invalidos' }),
  createRole
);
router.patch(
  '/roles/:id',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(updateRoleSchema, { message: 'Datos de rol invalidos' }),
  updateRole
);
router.put(
  '/roles/:id/permisos',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(setRolePermissionsSchema, { message: 'permisos invalido' }),
  setRolePermissions
);
router.post(
  '/usuarios',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(createUsuarioSchema, { message: 'Datos de usuario invalidos' }),
  createUsuario
);
router.patch(
  '/usuarios/:id',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(updateUsuarioSchema, { message: 'Datos de usuario invalidos' }),
  updateUsuario
);
router.get(
  '/usuarios/:id/sociedades',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  listSociedadesUsuario
);
router.put(
  '/usuarios/:id/sociedades',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(setUsuarioSociedadesSchema, { message: 'sociedad_ids invalido' }),
  setSociedadesUsuario
);
router.delete(
  '/usuarios/:id/avatar',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  deleteUsuarioAvatar
);

module.exports = router;
