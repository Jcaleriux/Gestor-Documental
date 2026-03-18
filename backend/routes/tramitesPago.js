const express = require('express');
const {
  rechazoTesoreria,
  accionTesoreria,
  listTramites,
  getRetencionesDisponibles,
  getTramite,
  getHistorial,
  crearTramite,
  cambiarEstado,
  decisionDocumento
} = require('../services/tramitesPagoService');
const { createError } = require('../utils/errors');
const { requireAnyPermission, requirePermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const {
  tesoreriaActionSchema,
  cambiarEstadoSchema,
  decisionDocumentoSchema,
  crearTramiteSchema,
  rechazoTesoreriaSchema
} = require('../validation/schemas');
const { PERMISSIONS, WORKFLOW_PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

// POST rechazo por tesoreria (legacy -> se trata como exclusion)
router.post(
  '/tramites-pago/:id/documentos/:facturaId/rechazo-tesoreria',
  validateBody(rechazoTesoreriaSchema),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  rechazoTesoreria
);

// POST accion tesoreria (reenviar / excluir / reincluir / devolver_contabilidad)
router.post(
  '/tramites-pago/:id/documentos/:facturaId/tesoreria',
  validateBody(tesoreriaActionSchema, { message: 'accion invalida' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  accionTesoreria
);

// GET lista de tramites
router.get('/tramites-pago', requirePermission(PERMISSIONS.DOCUMENTOS_VER), listTramites);
router.get('/tramites-pago/retenciones-disponibles', requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO), getRetencionesDisponibles);

// GET detalle de tramite
router.get('/tramites-pago/:id', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getTramite);

// GET historial de tramite
router.get('/tramites-pago/:id/historial', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getHistorial);

// POST crear tramite
router.post(
  '/tramites-pago',
  validateBody(crearTramiteSchema, { message: 'Seleccione al menos una factura o una retencion' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  crearTramite
);

// POST cambiar estado del tramite
router.post(
  '/tramites-pago/:id/estado',
  validateBody(cambiarEstadoSchema, { message: 'estado requerido' }),
  requireAnyPermission(WORKFLOW_PERMISSIONS),
  cambiarEstado
);

// POST decision por documento (gerencia / gerencia contable / financiera)
router.post(
  '/tramites-pago/:id/documentos/:facturaId/decision',
  validateBody(decisionDocumentoSchema, { message: 'etapa invalida' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_VER),
  decisionDocumento
);

module.exports = router;
