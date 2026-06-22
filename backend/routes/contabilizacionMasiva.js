const express = require('express');
const { validateBody } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const { PERMISSIONS } = require('../domain/permissions');
const { handleRequest } = require('../utils/http');
const { analizarDiarioDocumentosSchema } = require('../validation/schemas');
const repo = require('../repositories/contabilizacionMasivaRepository');
const { createContabilizacionMasivaUseCases } = require('../services/contabilizacionMasivaUseCases');

const router = express.Router({ mergeParams: true });
const useCases = createContabilizacionMasivaUseCases({ repo });

router.post(
  '/contabilizacion-masiva/diario-documentos/analizar',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  validateBody(analizarDiarioDocumentosSchema, { message: 'Datos de analisis invalidos' }),
  handleRequest(async (req) => {
    const { sociedad_id, file_path, resolutions } = req.body || {};

    return useCases.analyzeDiarioDocumentos({
      sociedadId: sociedad_id,
      filePath: file_path || undefined,
      resolutions
    });
  }, 'Error analyzing diario documentos:', 'Error analyzing diario documentos')
);

router.get(
  '/contabilizacion-masiva/diario-documentos/candidatos',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  handleRequest(async (req) => {
    const sociedadId = Number(req.query.sociedad_id);
    const query = req.query.query || req.query.q || '';
    const limit = Number(req.query.limit) || 10;

    return useCases.searchFacturaCandidates({
      sociedadId,
      query,
      limit
    });
  }, 'Error searching diario documentos candidates:', 'Error searching candidates')
);

module.exports = router;
