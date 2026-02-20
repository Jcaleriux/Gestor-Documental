const express = require('express');
const { listSociedades } = require('../services/sociedadesService');
const { requireAnyPermission } = require('../middleware/permissionsMiddleware');
const { SOCIEDADES_ACCESS_PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

router.get('/sociedades', requireAnyPermission(SOCIEDADES_ACCESS_PERMISSIONS), listSociedades);

module.exports = router;
