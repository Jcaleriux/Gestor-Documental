import axios from 'axios';

const listSociedadesAdmin = () => axios.get('/api/sociedades/admin');
const createSociedad = (payload) => axios.post('/api/sociedades', payload);
const updateSociedad = (id, payload) => axios.patch(`/api/sociedades/${id}`, payload);

export const sociedadesApi = {
  listSociedadesAdmin,
  createSociedad,
  updateSociedad,
};
