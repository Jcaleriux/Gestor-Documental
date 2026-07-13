import axios from 'axios';

const listUsuarios = () => axios.get('/api/usuarios');
const listRoles = () => axios.get('/api/roles');
const listPermisos = () => axios.get('/api/permisos');
const listSociedades = () => axios.get('/api/sociedades');
const createUsuario = (payload) => axios.post('/api/usuarios', payload);
const updateUsuario = (id, payload) => axios.patch(`/api/usuarios/${id}`, payload);
const createRole = (payload) => axios.post('/api/roles', payload);
const updateRole = (id, payload) => axios.patch(`/api/roles/${id}`, payload);
const setRolePermissions = (id, payload) => axios.put(`/api/roles/${id}/permisos`, payload);
const getSociedadesUsuario = (id) => axios.get(`/api/usuarios/${id}/sociedades`);
const setSociedadesUsuario = (id, payload) => axios.put(`/api/usuarios/${id}/sociedades`, payload);

export const usuariosApi = {
  listUsuarios,
  listRoles,
  listPermisos,
  listSociedades,
  createUsuario,
  updateUsuario,
  createRole,
  updateRole,
  setRolePermissions,
  getSociedadesUsuario,
  setSociedadesUsuario
};
