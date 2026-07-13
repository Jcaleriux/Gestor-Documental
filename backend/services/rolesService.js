const { handleRequest } = require('../utils/http');
const { createRolesUseCases } = require('./rolesUseCases');
const rolesRepo = require('../repositories/rolesRepository');
const rolesPermisosRepo = require('../repositories/rolesPermisosRepository');
const { permissionsService } = require('./permissionsService');

const useCases = createRolesUseCases({
  rolesRepo,
  rolesPermisosRepo,
  permissionsService
});

const listRoles = handleRequest(async () => {
  return useCases.listRoles();
}, 'Error fetching roles:', 'Error fetching roles');

const listPermisos = handleRequest(async () => {
  return useCases.listPermisos();
}, 'Error fetching permisos:', 'Error fetching permisos');

const createRole = handleRequest(async (req) => {
  const {
    codigo,
    nombre,
    descripcion,
    nivel_jerarquia,
    permisos
  } = req.body || {};

  return useCases.createRole({
    codigo,
    nombre,
    descripcion,
    nivel_jerarquia,
    permisos
  });
}, 'Error creating role:', 'Error creating role');

const updateRole = handleRequest(async (req) => {
  const { id } = req.params;
  const {
    nombre,
    descripcion,
    nivel_jerarquia,
    permisos
  } = req.body || {};

  return useCases.updateRole({
    id,
    nombre,
    descripcion,
    nivel_jerarquia,
    permisos
  });
}, 'Error updating role:', 'Error updating role');

const setRolePermissions = handleRequest(async (req) => {
  const { id } = req.params;
  const { permisos } = req.body || {};

  return useCases.setRolePermissions({
    id,
    permisos
  });
}, 'Error updating role permissions:', 'Error updating role permissions');

module.exports = {
  listRoles,
  listPermisos,
  createRole,
  updateRole,
  setRolePermissions
};
