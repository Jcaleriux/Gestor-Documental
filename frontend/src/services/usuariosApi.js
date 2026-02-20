import axios from 'axios';

const listUsuarios = () => axios.get('/api/usuarios');
const listRoles = () => axios.get('/api/roles');
const listSociedades = () => axios.get('/api/sociedades');
const createUsuario = (payload) => axios.post('/api/usuarios', payload);
const updateUsuario = (id, payload) => axios.patch(`/api/usuarios/${id}`, payload);
const getSociedadesUsuario = (id) => axios.get(`/api/usuarios/${id}/sociedades`);
const setSociedadesUsuario = (id, payload) => axios.put(`/api/usuarios/${id}/sociedades`, payload);

export const usuariosApi = {
  listUsuarios,
  listRoles,
  listSociedades,
  createUsuario,
  updateUsuario,
  getSociedadesUsuario,
  setSociedadesUsuario
};
