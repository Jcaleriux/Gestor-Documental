const express = require('express');
const { requireAnyPermission } = require('../middleware/permissionsMiddleware');
const {
  getStats,
  getWorkQueue,
  getRecentActivity,
  getRecentDocuments
} = require('../services/dashboardService');
const { DASHBOARD_ACCESS_PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

router.get('/dashboard/stats', requireAnyPermission(DASHBOARD_ACCESS_PERMISSIONS), getStats);
router.get('/dashboard/work-queue', requireAnyPermission(DASHBOARD_ACCESS_PERMISSIONS), getWorkQueue);
router.get('/dashboard/recent-activity', requireAnyPermission(DASHBOARD_ACCESS_PERMISSIONS), getRecentActivity);
router.get('/dashboard/recent-documents', requireAnyPermission(DASHBOARD_ACCESS_PERMISSIONS), getRecentDocuments);

module.exports = router;
