import axios from 'axios';

export const DASHBOARD_STATS_CONTRACT_ERROR_MESSAGE = 'El backend de dashboard devolvio un resumen no compatible.';
export const DASHBOARD_RECENT_DOCUMENTS_CONTRACT_ERROR_MESSAGE = 'El backend de dashboard devolvio documentos recientes no compatibles.';
export const DASHBOARD_WORK_QUEUE_CONTRACT_ERROR_MESSAGE = 'El backend de dashboard devolvio una cola de trabajo no compatible.';

const createContractError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

export const extractDashboardStatsPayload = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'No se pudo cargar el resumen del dashboard.');
  }

  const payload = response?.data?.data;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createContractError('DASHBOARD_STATS_CONTRACT_ERROR', DASHBOARD_STATS_CONTRACT_ERROR_MESSAGE);
  }

  return payload;
};

export const extractDashboardRecentDocumentsPayload = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'No se pudieron cargar los documentos recientes.');
  }

  const payload = response?.data?.data;
  if (!Array.isArray(payload)) {
    throw createContractError(
      'DASHBOARD_RECENT_DOCUMENTS_CONTRACT_ERROR',
      DASHBOARD_RECENT_DOCUMENTS_CONTRACT_ERROR_MESSAGE,
    );
  }

  return payload;
};

export const extractDashboardWorkQueuePayload = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'No se pudo cargar la cola de trabajo del dashboard.');
  }

  const payload = response?.data?.data;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createContractError(
      'DASHBOARD_WORK_QUEUE_CONTRACT_ERROR',
      DASHBOARD_WORK_QUEUE_CONTRACT_ERROR_MESSAGE,
    );
  }

  if (!payload.facturas || typeof payload.facturas !== 'object' || Array.isArray(payload.facturas)) {
    throw createContractError(
      'DASHBOARD_WORK_QUEUE_CONTRACT_ERROR',
      DASHBOARD_WORK_QUEUE_CONTRACT_ERROR_MESSAGE,
    );
  }

  if (!payload.tramites || typeof payload.tramites !== 'object' || Array.isArray(payload.tramites)) {
    throw createContractError(
      'DASHBOARD_WORK_QUEUE_CONTRACT_ERROR',
      DASHBOARD_WORK_QUEUE_CONTRACT_ERROR_MESSAGE,
    );
  }

  return payload;
};

const getStats = (params) => axios.get('/api/dashboard/stats', { params });
const getWorkQueue = (params) => axios.get('/api/dashboard/work-queue', { params });
const getRecentDocuments = (params) => axios.get('/api/dashboard/recent-documents', { params });

export const dashboardApi = {
  getStats,
  getWorkQueue,
  getRecentDocuments
};
