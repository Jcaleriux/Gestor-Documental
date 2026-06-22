import axios from 'axios';

const listProveedores = (sociedadId) => axios.get('/api/proveedores', {
  params: { sociedad_id: sociedadId }
});
const listProveedorHistorial = (id) => axios.get(`/api/proveedores/${id}/historial`);
const createProveedor = (payload) => axios.post('/api/proveedores', payload);
const updateProveedor = (id, payload) => axios.patch(`/api/proveedores/${id}`, payload);

export const proveedoresApi = {
  listProveedores,
  listProveedorHistorial,
  createProveedor,
  updateProveedor
};
