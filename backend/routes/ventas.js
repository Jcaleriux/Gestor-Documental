const express = require('express');
const { requireAnyPermission, requirePermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const {
  createVentaOperacionSchema,
  cancelVentaOperacionSchema,
  closeVentaOperacionSchema,
  transferVentaOperacionSchema,
  upsertVentaOperacionDocumentoSchema,
  syncVentaDocumentoSchema,
  replaceVentaOperacionDocumentoSchema,
} = require('../validation/schemas');
const {
  listOperacionesVenta,
  getOperacionVenta,
  createOperacionVenta,
  cancelOperacionVenta,
  closeOperacionVenta,
  transferOperacionVenta,
  upsertOperacionDocumentoVenta,
  syncOperacionDocumentoVenta,
  previewOperacionDocumentoVenta,
  replaceOperacionDocumentoVenta,
} = require('../services/ventasService');

const router = express.Router({ mergeParams: true });

const VENTAS_READ_PERMISSIONS = [
  PERMISSIONS.VENTAS_VER,
  PERMISSIONS.VENTAS_CREAR,
  PERMISSIONS.VENTAS_GESTIONAR,
];

router.get('/ventas/operaciones', requireAnyPermission(VENTAS_READ_PERMISSIONS), listOperacionesVenta);

router.get(
  '/ventas/operaciones/:operacionId',
  requireAnyPermission(VENTAS_READ_PERMISSIONS),
  getOperacionVenta,
);

router.post(
  '/ventas/operaciones',
  requireAnyPermission([PERMISSIONS.VENTAS_CREAR, PERMISSIONS.VENTAS_GESTIONAR]),
  validateBody(createVentaOperacionSchema, { message: 'Datos de operacion de venta invalidos' }),
  createOperacionVenta,
);

router.post(
  '/ventas/operaciones/sync-documento',
  requireAnyPermission([PERMISSIONS.VENTAS_CREAR, PERMISSIONS.VENTAS_GESTIONAR]),
  validateBody(syncVentaDocumentoSchema, { message: 'Datos de sincronizacion invalidos' }),
  syncOperacionDocumentoVenta,
);

router.post(
  '/ventas/operaciones/:operacionId/documentos',
  requireAnyPermission([PERMISSIONS.VENTAS_CREAR, PERMISSIONS.VENTAS_GESTIONAR]),
  validateBody(upsertVentaOperacionDocumentoSchema, { message: 'Datos de documento invalidos' }),
  upsertOperacionDocumentoVenta,
);

router.get(
  '/ventas/operaciones/:operacionId/documentos/:documentoId/preview',
  requireAnyPermission(VENTAS_READ_PERMISSIONS),
  previewOperacionDocumentoVenta,
);

router.post(
  '/ventas/operaciones/:operacionId/documentos/:documentoId/reemplazar',
  requirePermission(PERMISSIONS.VENTAS_GESTIONAR),
  validateBody(replaceVentaOperacionDocumentoSchema, { message: 'Datos de reemplazo de documento invalidos' }),
  replaceOperacionDocumentoVenta,
);

router.post(
  '/ventas/operaciones/:operacionId/cancelar',
  requirePermission(PERMISSIONS.VENTAS_GESTIONAR),
  validateBody(cancelVentaOperacionSchema, { message: 'Datos de cancelacion invalidos' }),
  cancelOperacionVenta,
);

router.post(
  '/ventas/operaciones/:operacionId/cerrar',
  requirePermission(PERMISSIONS.VENTAS_GESTIONAR),
  validateBody(closeVentaOperacionSchema, { message: 'Datos de cierre invalidos' }),
  closeOperacionVenta,
);

router.post(
  '/ventas/operaciones/:operacionId/trasladar',
  requirePermission(PERMISSIONS.VENTAS_GESTIONAR),
  validateBody(transferVentaOperacionSchema, { message: 'Datos de traslado invalidos' }),
  transferOperacionVenta,
);

module.exports = router;
