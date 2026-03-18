import axios from 'axios';

const listOperaciones = (params) => axios.get('/api/reservas/operaciones', { params });
const getOperacion = (operacionId) => axios.get(`/api/reservas/operaciones/${operacionId}`);
const createOperacion = (payload) => axios.post('/api/reservas/operaciones', payload);
const cancelOperacion = (operacionId, payload) =>
  axios.post(`/api/reservas/operaciones/${operacionId}/cancelar`, payload);
const closeOperacion = (operacionId, payload) =>
  axios.post(`/api/reservas/operaciones/${operacionId}/cerrar`, payload);
const transferOperacion = (operacionId, payload) =>
  axios.post(`/api/reservas/operaciones/${operacionId}/trasladar`, payload);
const upsertDocumento = (operacionId, payload) =>
  axios.post(`/api/reservas/operaciones/${operacionId}/documentos`, payload);
const syncDocumento = (payload) => axios.post('/api/reservas/operaciones/sync-documento', payload);
const replaceDocumento = (operacionId, documentoId, payload) =>
  axios.post(`/api/reservas/operaciones/${operacionId}/documentos/${documentoId}/reemplazar`, payload);
const buildPreviewDocumentoUrl = ({ operacionId, documentoId, token }) => {
  const base = `/api/reservas/operaciones/${operacionId}/documentos/${documentoId}/preview`;
  if (!token) {
    return base;
  }
  return `${base}?token=${encodeURIComponent(token)}`;
};

export const reservasApi = {
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


