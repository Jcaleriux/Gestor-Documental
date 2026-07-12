const express = require('express');
const { requireAnyPermission } = require('../middleware/permissionsMiddleware');
const { DASHBOARD_ACCESS_PERMISSIONS } = require('../domain/permissions');
const { explorarDocumentos } = require('../services/exploradorDocumentosService');

const router = express.Router({ mergeParams: true });

router.get(
  '/explorador/documentos',
  requireAnyPermission(DASHBOARD_ACCESS_PERMISSIONS),
  explorarDocumentos
);

module.exports = router;
