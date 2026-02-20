const { handleRequest } = require('../utils/http');
const { createUsuariosUseCases } = require('./usuariosUseCases');
const usuariosRepo = require('../repositories/usuariosRepository');
const rolesRepo = require('../repositories/rolesRepository');
const sociedadesRepo = require('../repositories/sociedadesRepository');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const useCases = createUsuariosUseCases({
  usuariosRepo,
  rolesRepo,
  sociedadesRepo,
  usuariosSociedadesRepo
});

const listUsuarios = handleRequest(async () => {
  return useCases.listUsuarios();
}, 'Error fetching usuarios:', 'Error fetching usuarios');

const listRoles = handleRequest(async () => {
  return useCases.listRoles();
}, 'Error fetching roles:', 'Error fetching roles');

const createUsuario = handleRequest(async (req) => {
  const {
    nombre,
    email,
    password,
    rol_id,
    activo
  } = req.body || {};

  return useCases.createUsuario({
    nombre,
    email,
    password,
    rol_id,
    activo
  });
}, 'Error creating usuario:', 'Error creating usuario');

const updateUsuario = handleRequest(async (req) => {
  const { id } = req.params;
  const {
    nombre,
    email,
    rol_id,
    activo,
    password
  } = req.body || {};

  return useCases.updateUsuario({
    id,
    nombre,
    email,
    rol_id,
    activo,
    password
  });
}, 'Error updating usuario:', 'Error updating usuario');

const listSociedadesUsuario = handleRequest(async (req) => {
  const { id } = req.params;
  return useCases.listSociedadesUsuario({ userId: id });
}, 'Error fetching usuario sociedades:', 'Error fetching usuario sociedades');

const setSociedadesUsuario = handleRequest(async (req) => {
  const { id } = req.params;
  const { sociedad_ids } = req.body || {};
  return useCases.setSociedadesUsuario({
    userId: id,
    sociedad_ids
  });
}, 'Error saving usuario sociedades:', 'Error saving usuario sociedades');

module.exports = {
  listUsuarios,
  listRoles,
  createUsuario,
  updateUsuario,
  listSociedadesUsuario,
  setSociedadesUsuario
};
