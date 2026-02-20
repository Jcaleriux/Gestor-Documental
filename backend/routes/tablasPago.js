const express = require('express');
const { requireAnyPermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const { createTablaPagoSchema } = require('../validation/schemas');
const {
  listTablasPago,
  createTablaPago,
  deleteTablaPago
} = require('../services/tablasPagoService');

const router = express.Router({ mergeParams: true });

router.get(
  '/tablas-pago',
  requireAnyPermission([
    PERMISSIONS.DOCUMENTOS_CONTABILIZAR,
    PERMISSIONS.DOCUMENTOS_SUBIR,
    PERMISSIONS.USUARIOS_ADMINISTRAR
  ]),
  listTablasPago
);

router.post(
  '/tablas-pago',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_SUBIR, PERMISSIONS.USUARIOS_ADMINISTRAR]),
  validateBody(createTablaPagoSchema, { message: 'Datos de tabla de pago invalidos' }),
  createTablaPago
);

router.delete(
  '/tablas-pago/:tablaPagoId',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_SUBIR, PERMISSIONS.USUARIOS_ADMINISTRAR]),
  deleteTablaPago
);

module.exports = router;
