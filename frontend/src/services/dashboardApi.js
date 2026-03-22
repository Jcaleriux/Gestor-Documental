import axios from 'axios';

export const DASHBOARD_STATS_CONTRACT_ERROR_MESSAGE = 'El backend de dashboard devolvio un resumen no compatible.';
export const DASHBOARD_RECENT_DOCUMENTS_CONTRACT_ERROR_MESSAGE = 'El backend de dashboard devolvio documentos recientes no compatibles.';

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

const getStats = (params) => axios.get('/api/dashboard/stats', { params });
const getRecentDocuments = (params) => axios.get('/api/dashboard/recent-documents', { params });

export const dashboardApi = {
  getStats,
  getRecentDocuments
};
