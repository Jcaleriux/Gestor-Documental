const express = require('express');
const { handleRequest } = require('../utils/http');
const { validateBody } = require('../middleware/validate');
const { requireAnyPermission, requirePermission } = require('../middleware/permissionsMiddleware');
const { createAuditoriaSchema, createEstadoSchema, updateEstadoSchema } = require('../validation/schemas');
const { createAuditoriaUseCases } = require('../services/auditoriaUseCases');
const auditoriaRepo = require('../repositories/auditoriaRepository');
const { PERMISSIONS, WORKFLOW_PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

const useCases = createAuditoriaUseCases({ auditoriaRepo });

// GET historial/auditoria de un documento
router.get(
  '/documentos/:facturaId/auditoria',
  requirePermission(PERMISSIONS.AUDITORIA_VER),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    return useCases.listAuditoria({ facturaId });
  }, 'Error fetching audit:', 'Error fetching audit')
);

// POST registro de auditoria
router.post(
  '/documentos/:facturaId/auditoria',
  requirePermission(PERMISSIONS.AUDITORIA_VER),
  validateBody(createAuditoriaSchema, { message: 'accion y usuario requeridos' }),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { accion, usuario, detalles, ip_address } = req.body || {};
    return useCases.crearAuditoria({ facturaId, accion, usuario, detalles, ip_address });
  }, 'Error creating audit record:', 'Error creating audit record')
);

// GET/POST estados de un documento
router.get(
  '/documentos/:facturaId/estados',
  requirePermission(PERMISSIONS.DOCUMENTOS_VER),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    return useCases.listEstados({ facturaId });
  }, 'Error fetching states:', 'Error fetching states')
);

router.post(
  '/documentos/:facturaId/estados',
  requireAnyPermission(WORKFLOW_PERMISSIONS),
  validateBody(createEstadoSchema, { message: 'estado_nuevo y usuario requeridos' }),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { estado_anterior, estado_nuevo, usuario, motivo } = req.body || {};
    return useCases.crearEstado({ facturaId, estado_anterior, estado_nuevo, usuario, motivo });
  }, 'Error creating state record:', 'Error creating state record')
);

// PATCH actualizar estado actual de una factura
router.patch(
  '/documentos/:facturaId/estado',
  requireAnyPermission(WORKFLOW_PERMISSIONS),
  validateBody(updateEstadoSchema, { message: 'estado requerido' }),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { estado } = req.body || {};
    return useCases.actualizarEstadoFactura({ facturaId, estado });
  }, 'Error updating state:', 'Error updating state')
);

module.exports = router;
