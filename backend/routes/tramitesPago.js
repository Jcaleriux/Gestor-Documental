const express = require('express');
const {
  rechazoTesoreria,
  accionTesoreria,
  listTramites,
  getRetencionesDisponibles,
  getTramite,
  getHistorial,
  uploadCaratulas,
  resolveCaratulas,
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
  rechazoTesoreriaSchema,
  uploadTramiteCaratulasSchema,
  resolveTramiteCaratulasSchema
} = require('../validation/schemas');
const { PERMISSIONS, WORKFLOW_PERMISSIONS, TRAMITES_READ_PERMISSIONS } = require('../domain/permissions');

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
router.get('/tramites-pago', requireAnyPermission(TRAMITES_READ_PERMISSIONS), listTramites);
router.get('/tramites-pago/retenciones-disponibles', requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO), getRetencionesDisponibles);

// GET detalle de tramite
router.get('/tramites-pago/:id', requireAnyPermission(TRAMITES_READ_PERMISSIONS), getTramite);

// GET historial de tramite
router.get('/tramites-pago/:id/historial', requireAnyPermission(TRAMITES_READ_PERMISSIONS), getHistorial);

// POST cargar o reemplazar caratulas de un tramite
router.post(
  '/tramites-pago/:id/caratulas',
  validateBody(uploadTramiteCaratulasSchema, { message: 'caratulas invalidas' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  uploadCaratulas
);

// POST resolver coincidencias manuales de caratulas
router.post(
  '/tramites-pago/:id/caratulas/resolver',
  validateBody(resolveTramiteCaratulasSchema, { message: 'resolucion de caratulas invalida' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  resolveCaratulas
);

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
