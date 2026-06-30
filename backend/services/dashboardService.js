const { createDashboardUseCases } = require('./dashboardUseCases');
const dashboardRepo = require('../repositories/dashboardRepository');
const { handleRequest } = require('../utils/http');

const useCases = createDashboardUseCases({ dashboardRepo });

const getStats = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getStats({ sociedadId, user: req.user });
}, 'Error fetching dashboard stats:', 'Error fetching dashboard stats');

const getWorkQueue = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getWorkQueue({ sociedadId, user: req.user });
}, 'Error fetching dashboard work queue:', 'Error fetching dashboard work queue');

const getRecentActivity = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getRecentActivity({ sociedadId, user: req.user });
}, 'Error fetching recent activity:', 'Error fetching recent activity');

const getRecentDocuments = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getRecentDocuments({ sociedadId, user: req.user });
}, 'Error fetching recent document updates:', 'Error fetching recent document updates');

module.exports = {
  getStats,
  getWorkQueue,
  getRecentActivity,
  getRecentDocuments
};
