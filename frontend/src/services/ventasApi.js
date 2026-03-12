import axios from 'axios';

const listOperaciones = (params) => axios.get('/api/ventas/operaciones', { params });
const getOperacion = (operacionId) => axios.get(`/api/ventas/operaciones/${operacionId}`);
const createOperacion = (payload) => axios.post('/api/ventas/operaciones', payload);
const cancelOperacion = (operacionId, payload) =>
  axios.post(`/api/ventas/operaciones/${operacionId}/cancelar`, payload);
const closeOperacion = (operacionId, payload) =>
  axios.post(`/api/ventas/operaciones/${operacionId}/cerrar`, payload);
const transferOperacion = (operacionId, payload) =>
  axios.post(`/api/ventas/operaciones/${operacionId}/trasladar`, payload);
const upsertDocumento = (operacionId, payload) =>
  axios.post(`/api/ventas/operaciones/${operacionId}/documentos`, payload);
const syncDocumento = (payload) => axios.post('/api/ventas/operaciones/sync-documento', payload);
const replaceDocumento = (operacionId, documentoId, payload) =>
  axios.post(`/api/ventas/operaciones/${operacionId}/documentos/${documentoId}/reemplazar`, payload);
const buildPreviewDocumentoUrl = ({ operacionId, documentoId, token }) => {
  const base = `/api/ventas/operaciones/${operacionId}/documentos/${documentoId}/preview`;
  if (!token) {
    return base;
  }
  return `${base}?token=${encodeURIComponent(token)}`;
};

export const ventasApi = {
  listOperaciones,
  getOperacion,
  createOperacion,
  cancelOperacion,
  closeOperacion,
  transferOperacion,
  upsertDocumento,
  syncDocumento,
  replaceDocumento,
  buildPreviewDocumentoUrl,
};
