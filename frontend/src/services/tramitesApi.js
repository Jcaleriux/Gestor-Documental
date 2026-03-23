import axios from 'axios';

const getDetalle = (id) => axios.get(`/api/tramites-pago/${id}`);
const getHistorial = (id) => axios.get(`/api/tramites-pago/${id}/historial`);
const listTramites = (params) => axios.get('/api/tramites-pago', { params });
const getRetencionesDisponibles = (params) => axios.get('/api/tramites-pago/retenciones-disponibles', { params });
const crearTramite = (payload) => axios.post('/api/tramites-pago', payload);
const cambiarEstado = (id, payload) => axios.post(`/api/tramites-pago/${id}/estado`, payload);
const uploadCaratulas = (id, payload) => axios.post(`/api/tramites-pago/${id}/caratulas`, payload);
const resolveCaratulas = (id, payload) => axios.post(`/api/tramites-pago/${id}/caratulas/resolver`, payload);
const confirmProviderCaratulaOrder = (id, providerKey, payload) =>
  axios.post(`/api/tramites-pago/${id}/caratulas/proveedores/${encodeURIComponent(providerKey)}/confirm-order`, payload);
const uploadProviderCaratula = (id, providerKey, payload) =>
  axios.post(`/api/tramites-pago/${id}/caratulas/proveedores/${encodeURIComponent(providerKey)}/upload`, payload);
const confirmProviderCaratula = (id, providerKey, payload) =>
  axios.post(`/api/tramites-pago/${id}/caratulas/proveedores/${encodeURIComponent(providerKey)}/confirm`, payload);
const assignOrphanCaratula = (id, orphanId, payload) =>
  axios.post(`/api/tramites-pago/${id}/caratulas/huerfanas/${orphanId}/assign`, payload);
const discardOrphanCaratula = (id, orphanId, payload) =>
  axios.post(`/api/tramites-pago/${id}/caratulas/huerfanas/${orphanId}/discard`, payload);
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
  uploadCaratulas,
  resolveCaratulas,
  confirmProviderCaratulaOrder,
  uploadProviderCaratula,
  confirmProviderCaratula,
  assignOrphanCaratula,
  discardOrphanCaratula,
  decisionDocumento,
  accionTesoreria,
  getSociedades
};
