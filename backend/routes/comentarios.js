const express = require('express');
const { handleRequest } = require('../utils/http');
const { validateBody } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const { createComentarioSchema } = require('../validation/schemas');
const { createComentariosUseCases } = require('../services/comentariosUseCases');
const comentariosRepo = require('../repositories/comentariosRepository');
const { PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

const useCases = createComentariosUseCases({ comentariosRepo });

// GET comentarios de un documento
router.get(
  '/documentos/:facturaId/comentarios',
  requirePermission(PERMISSIONS.DOCUMENTOS_VER),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    return useCases.listComentarios({ facturaId });
  }, 'Error fetching comments:', 'Error fetching comments')
);

// POST nuevo comentario
router.post(
  '/documentos/:facturaId/comentarios',
  requirePermission(PERMISSIONS.DOCUMENTOS_COMENTAR),
  validateBody(createComentarioSchema, { message: 'usuario y texto requeridos' }),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { usuario, texto } = req.body || {};
    return useCases.crearComentario({ facturaId, usuario, texto });
  }, 'Error creating comment:', 'Error creating comment')
);

module.exports = router;
