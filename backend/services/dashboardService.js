const { createDashboardUseCases } = require('./dashboardUseCases');
const dashboardRepo = require('../repositories/dashboardRepository');
const { handleRequest } = require('../utils/http');

const useCases = createDashboardUseCases({ dashboardRepo });

const getStats = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getStats({ sociedadId });
}, 'Error fetching dashboard stats:', 'Error fetching dashboard stats');

const getRecentActivity = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getRecentActivity({ sociedadId });
}, 'Error fetching recent activity:', 'Error fetching recent activity');

const getRecentDocuments = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getRecentDocuments({ sociedadId });
}, 'Error fetching recent document updates:', 'Error fetching recent document updates');

module.exports = {
  getStats,
  getRecentActivity,
  getRecentDocuments
};
