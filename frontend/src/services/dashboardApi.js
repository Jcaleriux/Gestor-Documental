import axios from 'axios';

const getStats = (params) => axios.get('/api/dashboard/stats', { params });
const getRecentDocuments = (params) => axios.get('/api/dashboard/recent-documents', { params });

export const dashboardApi = {
  getStats,
  getRecentDocuments
};
