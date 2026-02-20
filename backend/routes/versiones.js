const express = require('express');
const { handleRequest } = require('../utils/http');
const { validateBody } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const { createVersionSchema } = require('../validation/schemas');
const { createVersionesUseCases } = require('../services/versionesUseCases');
const versionesRepo = require('../repositories/versionesRepository');
const { PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

const useCases = createVersionesUseCases({ versionesRepo });

// GET versiones de un documento
router.get(
  '/documentos/:facturaId/versiones',
  requirePermission(PERMISSIONS.DOCUMENTOS_VER),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    return useCases.listVersiones({ facturaId });
  }, 'Error fetching versions:', 'Error fetching versions')
);

// POST nueva version
router.post(
  '/documentos/:facturaId/versiones',
  requirePermission(PERMISSIONS.DOCUMENTOS_SUBIR),
  validateBody(createVersionSchema, { message: 'usuario y cambios requeridos' }),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { usuario, cambios, ruta_archivo } = req.body || {};
    return useCases.crearVersion({ facturaId, usuario, cambios, ruta_archivo });
  }, 'Error creating version:', 'Error creating version')
);

module.exports = router;
