const express = require('express');
const { requireAnyPermission, requirePermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const {
  createReservaOperacionSchema,
  cancelReservaOperacionSchema,
  closeReservaOperacionSchema,
  transferReservaOperacionSchema,
  upsertReservaOperacionDocumentoSchema,
  syncReservaDocumentoSchema,
  replaceReservaOperacionDocumentoSchema,
} = require('../validation/schemas');
const {
  listOperacionesReserva,
  getOperacionReserva,
  createOperacionReserva,
  cancelOperacionReserva,
  closeOperacionReserva,
  transferOperacionReserva,
  upsertOperacionDocumentoReserva,
  syncOperacionDocumentoReserva,
  previewOperacionDocumentoReserva,
  replaceOperacionDocumentoReserva,
} = require('../services/reservasService');

const router = express.Router({ mergeParams: true });

const RESERVAS_READ_PERMISSIONS = [
  PERMISSIONS.RESERVAS_VER,
  PERMISSIONS.RESERVAS_CREAR,
  PERMISSIONS.RESERVAS_GESTIONAR,
];

router.get('/reservas/operaciones', requireAnyPermission(RESERVAS_READ_PERMISSIONS), listOperacionesReserva);

router.get(
  '/reservas/operaciones/:operacionId',
  requireAnyPermission(RESERVAS_READ_PERMISSIONS),
  getOperacionReserva,
);

router.post(
  '/reservas/operaciones',
  requireAnyPermission([PERMISSIONS.RESERVAS_CREAR, PERMISSIONS.RESERVAS_GESTIONAR]),
  validateBody(createReservaOperacionSchema, { message: 'Datos de reserva invalidos' }),
  createOperacionReserva,
);

router.post(
  '/reservas/operaciones/sync-documento',
  requireAnyPermission([PERMISSIONS.RESERVAS_CREAR, PERMISSIONS.RESERVAS_GESTIONAR]),
  validateBody(syncReservaDocumentoSchema, { message: 'Datos de sincronizacion invalidos' }),
  syncOperacionDocumentoReserva,
);

router.post(
  '/reservas/operaciones/:operacionId/documentos',
  requireAnyPermission([PERMISSIONS.RESERVAS_CREAR, PERMISSIONS.RESERVAS_GESTIONAR]),
  validateBody(upsertReservaOperacionDocumentoSchema, { message: 'Datos de documento invalidos' }),
  upsertOperacionDocumentoReserva,
);

router.get(
  '/reservas/operaciones/:operacionId/documentos/:documentoId/preview',
  requireAnyPermission(RESERVAS_READ_PERMISSIONS),
  previewOperacionDocumentoReserva,
);

router.post(
  '/reservas/operaciones/:operacionId/documentos/:documentoId/reemplazar',
  requirePermission(PERMISSIONS.RESERVAS_GESTIONAR),
  validateBody(replaceReservaOperacionDocumentoSchema, { message: 'Datos de reemplazo de documento invalidos' }),
  replaceOperacionDocumentoReserva,
);

router.post(
  '/reservas/operaciones/:operacionId/cancelar',
  requirePermission(PERMISSIONS.RESERVAS_GESTIONAR),
  validateBody(cancelReservaOperacionSchema, { message: 'Datos de cancelacion invalidos' }),
  cancelOperacionReserva,
);

router.post(
  '/reservas/operaciones/:operacionId/cerrar',
  requirePermission(PERMISSIONS.RESERVAS_GESTIONAR),
  validateBody(closeReservaOperacionSchema, { message: 'Datos de cierre invalidos' }),
  closeOperacionReserva,
);

router.post(
  '/reservas/operaciones/:operacionId/trasladar',
  requirePermission(PERMISSIONS.RESERVAS_GESTIONAR),
  validateBody(transferReservaOperacionSchema, { message: 'Datos de traslado invalidos' }),
  transferOperacionReserva,
);

module.exports = router;
























