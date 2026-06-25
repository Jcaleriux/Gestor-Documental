const express = require('express');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const { handleRequest } = require('../utils/http');
const { withTransaction } = require('../db/withTransaction');
const { assignPdfPendienteSchema } = require('../validation/schemas');
const repo = require('../repositories/pdfsPendientesRepository');
const { createPdfsPendientesUseCases } = require('../services/pdfsPendientesUseCases');

const router = express.Router({ mergeParams: true });
const useCases = createPdfsPendientesUseCases({
  repo,
  runInTransaction: (handler) => withTransaction(() => repo.getClient(), handler)
});

router.get(
  '/pdfs-pendientes',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  handleRequest(async () => useCases.listPendingPdfs(), 'Error listing pending PDFs:', 'Error listing pending PDFs')
);

router.get(
  '/pdfs-pendientes/facturas-candidatas',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  handleRequest(async (req) => useCases.searchFacturaCandidates({
    sociedadId: req.query.sociedad_id || req.query.sociedadId,
    query: req.query.query || req.query.q || '',
    limit: req.query.limit
  }), 'Error searching pending PDF candidates:', 'Error searching candidates')
);

router.post(
  '/pdfs-pendientes/asignar',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  validateBody(assignPdfPendienteSchema, { message: 'Datos de asignacion invalidos' }),
  handleRequest(async (req) => {
    const actorUsuario = req.user?.email || req.user?.nombre || 'system';

    return useCases.assignPendingPdf({
      ingestionId: req.body.ingestion_id,
      pdfRuta: req.body.pdf_ruta,
      facturaId: req.body.factura_id,
      sociedadId: req.body.sociedad_id,
      overwrite: req.body.overwrite,
      usuario: actorUsuario
    });
  }, 'Error assigning pending PDF:', 'Error assigning pending PDF')
);

module.exports = router;
