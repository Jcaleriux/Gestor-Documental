import axios from 'axios';

export const RESERVAS_LIST_CONTRACT_ERROR_MESSAGE = 'El backend de reservas devolvio un formato no compatible. Reinicia o actualiza la API para usar el flujo actual de reservas.';
export const RESERVAS_DETAIL_CONTRACT_ERROR_MESSAGE = 'El backend de reservas no devolvio un detalle compatible.';
export const RESERVAS_ACTION_CONTRACT_ERROR_MESSAGE = 'El backend de reservas no devolvio una respuesta valida.';

const createContractError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const extractSuccessPayload = (response, fallbackMessage) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || fallbackMessage);
  }

  if (response?.data?.success !== true) {
    throw createContractError('RESERVAS_ACTION_CONTRACT_ERROR', RESERVAS_ACTION_CONTRACT_ERROR_MESSAGE);
  }

  return response.data.data;
};

export const extractReservasListPayload = (response) => {
  const payload = extractSuccessPayload(response, 'No se pudo cargar el listado de reservas.');
  if (!Array.isArray(payload)) {
    throw createContractError('RESERVAS_LIST_CONTRACT_ERROR', RESERVAS_LIST_CONTRACT_ERROR_MESSAGE);
  }

  return payload;
};

export const extractReservaDetallePayload = (response) => {
  const payload = extractSuccessPayload(response, 'No se pudo cargar el detalle de la reserva.');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createContractError('RESERVAS_DETAIL_CONTRACT_ERROR', RESERVAS_DETAIL_CONTRACT_ERROR_MESSAGE);
  }

  if (!payload.operacion || typeof payload.operacion !== 'object') {
    throw createContractError(
      'RESERVAS_DETAIL_CONTRACT_ERROR',
      'El backend de reservas no devolvio la operacion solicitada.',
    );
  }

  return {
    operacion: payload.operacion,
    historial: Array.isArray(payload.historial) ? payload.historial : [],
    documentos: Array.isArray(payload.documentos) ? payload.documentos : [],
  };
};

export const extractReservaActionPayload = (
  response,
  fallbackMessage = 'No se pudo completar la accion de reservas.',
) => extractSuccessPayload(response, fallbackMessage);

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


