const express = require('express');
const { createFilesHandlers } = require('../services/filesService');
const { requireAnyPermission } = require('../middleware/permissionsMiddleware');
const { PERMISSIONS } = require('../domain/permissions');
const { runtimeConfig } = require('../config/runtime');

const router = express.Router({ mergeParams: true });

const { getXml, getPdf } = createFilesHandlers(runtimeConfig.storageBaseDir);

router.get(
  '/files/xml',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_VER, PERMISSIONS.DOCUMENTOS_DESCARGAR]),
  getXml
);
router.get(
  '/files/pdf',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_VER, PERMISSIONS.DOCUMENTOS_DESCARGAR]),
  getPdf
);

module.exports = router;
