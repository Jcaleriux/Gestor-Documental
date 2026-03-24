const express = require('express');
const {
  rechazoTesoreria,
  accionTesoreria,
  listTramites,
  getRetencionesDisponibles,
  getTramite,
  getTramitePdfUnificado,
  getHistorial,
  uploadCaratulas,
  resolveCaratulas,
  confirmProviderCaratulaOrder,
  uploadProviderCaratula,
  confirmProviderCaratula,
  assignOrphanCaratula,
  discardOrphanCaratula,
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
  resolveTramiteCaratulasSchema,
  confirmProviderCaratulaOrderSchema,
  uploadProviderCaratulaSchema,
  confirmProviderCaratulaSchema,
  assignOrphanCaratulaSchema,
  discardOrphanCaratulaSchema
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

// GET PDF unificado del detalle del tramite
router.get('/tramites-pago/:id/pdf-unificado', requireAnyPermission(TRAMITES_READ_PERMISSIONS), getTramitePdfUnificado);

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

router.post(
  '/tramites-pago/:id/caratulas/proveedores/:providerKey/confirm-order',
  validateBody(confirmProviderCaratulaOrderSchema, { message: 'orden de caratula invalido' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  confirmProviderCaratulaOrder
);

router.post(
  '/tramites-pago/:id/caratulas/proveedores/:providerKey/upload',
  validateBody(uploadProviderCaratulaSchema, { message: 'caratula de proveedor invalida' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  uploadProviderCaratula
);

router.post(
  '/tramites-pago/:id/caratulas/proveedores/:providerKey/confirm',
  validateBody(confirmProviderCaratulaSchema, { message: 'confirmacion de caratula invalida' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  confirmProviderCaratula
);

router.post(
  '/tramites-pago/:id/caratulas/huerfanas/:orphanId/assign',
  validateBody(assignOrphanCaratulaSchema, { message: 'asignacion de caratula huerfana invalida' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  assignOrphanCaratula
);

router.post(
  '/tramites-pago/:id/caratulas/huerfanas/:orphanId/discard',
  validateBody(discardOrphanCaratulaSchema, { message: 'descarte de caratula huerfana invalido' }),
  requirePermission(PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO),
  discardOrphanCaratula
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
