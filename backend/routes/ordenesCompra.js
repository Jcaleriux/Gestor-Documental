const express = require('express');
const { requireAnyPermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const {
  createOrdenCompraSchema,
  autoImportOrdenCompraSchema,
  updateOrdenCompraEstadoSchema
} = require('../validation/schemas');
const {
  listOrdenesCompra,
  createOrdenCompra,
  autoImportOrdenCompra,
  deleteOrdenCompra,
  updateEstadoManualOrdenCompra
} = require('../services/ordenesCompraService');

const router = express.Router({ mergeParams: true });

router.get(
  '/ordenes-compra',
  requireAnyPermission([
    PERMISSIONS.DOCUMENTOS_CONTABILIZAR,
    PERMISSIONS.DOCUMENTOS_SUBIR,
    PERMISSIONS.USUARIOS_ADMINISTRAR
  ]),
  listOrdenesCompra
);

router.post(
  '/ordenes-compra',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_SUBIR, PERMISSIONS.USUARIOS_ADMINISTRAR]),
  validateBody(createOrdenCompraSchema, { message: 'Datos de orden de compra invalidos' }),
  createOrdenCompra
);

router.post(
  '/ordenes-compra/auto-import',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_SUBIR, PERMISSIONS.USUARIOS_ADMINISTRAR]),
  validateBody(autoImportOrdenCompraSchema, { message: 'Datos de auto import invalidos' }),
  autoImportOrdenCompra
);

router.patch(
  '/ordenes-compra/:ordenCompraId/estado-manual',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_CONTABILIZAR, PERMISSIONS.USUARIOS_ADMINISTRAR]),
  validateBody(updateOrdenCompraEstadoSchema, { message: 'Datos de estado invalidos' }),
  updateEstadoManualOrdenCompra
);

router.delete(
  '/ordenes-compra/:ordenCompraId',
  requireAnyPermission([PERMISSIONS.DOCUMENTOS_SUBIR, PERMISSIONS.USUARIOS_ADMINISTRAR]),
  deleteOrdenCompra
);

module.exports = router;
