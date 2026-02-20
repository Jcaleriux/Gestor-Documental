import axios from 'axios';

const getDetalle = (id) => axios.get(`/api/tramites-pago/${id}`);
const getHistorial = (id) => axios.get(`/api/tramites-pago/${id}/historial`);
const listTramites = (params) => axios.get('/api/tramites-pago', { params });
const getRetencionesDisponibles = (params) => axios.get('/api/tramites-pago/retenciones-disponibles', { params });
const crearTramite = (payload) => axios.post('/api/tramites-pago', payload);
const cambiarEstado = (id, payload) => axios.post(`/api/tramites-pago/${id}/estado`, payload);
const decisionDocumento = (id, facturaId, payload) =>
  axios.post(`/api/tramites-pago/${id}/documentos/${facturaId}/decision`, payload);
const accionTesoreria = (id, facturaId, payload) =>
  axios.post(`/api/tramites-pago/${id}/documentos/${facturaId}/tesoreria`, payload);
const getSociedades = () => axios.get('/api/sociedades');

export const tramitesApi = {
  getDetalle,
  getHistorial,
  listTramites,
  getRetencionesDisponibles,
  crearTramite,
  cambiarEstado,
  decisionDocumento,
  accionTesoreria,
  getSociedades
};
