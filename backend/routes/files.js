const express = require('express');
const path = require('path');
const { createFilesHandlers } = require('../services/filesService');
const { requireAnyPermission } = require('../middleware/permissionsMiddleware');
const { PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

const defaultBaseDir = path.resolve(__dirname, '..', '..');
const baseDir = process.env.FACTURAS_BASE_DIR || defaultBaseDir;
const { getXml, getPdf } = createFilesHandlers(baseDir);

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
