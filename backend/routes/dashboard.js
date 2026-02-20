const express = require('express');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const {
  getStats,
  getRecentActivity,
  getRecentDocuments
} = require('../services/dashboardService');
const { PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

router.get('/dashboard/stats', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getStats);
router.get('/dashboard/recent-activity', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getRecentActivity);
router.get('/dashboard/recent-documents', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getRecentDocuments);

module.exports = router;
