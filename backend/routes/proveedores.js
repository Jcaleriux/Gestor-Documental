const express = require('express');
const { requirePermission, requireAnyPermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const {
  createProveedorSchema,
  updateProveedorSchema
} = require('../validation/schemas');
const {
  listProveedores,
  listProveedorHistorial,
  createProveedor,
  updateProveedor
} = require('../services/proveedoresService');

const router = express.Router({ mergeParams: true });

router.get(
  '/proveedores',
  requireAnyPermission([
    PERMISSIONS.USUARIOS_ADMINISTRAR,
    PERMISSIONS.DOCUMENTOS_CONTABILIZAR,
    PERMISSIONS.DOCUMENTOS_SUBIR
  ]),
  listProveedores
);
router.get(
  '/proveedores/:id/historial',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  listProveedorHistorial
);
router.post(
  '/proveedores',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(createProveedorSchema, { message: 'Datos de proveedor invalidos' }),
  createProveedor
);
router.patch(
  '/proveedores/:id',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(updateProveedorSchema, { message: 'Datos de proveedor invalidos' }),
  updateProveedor
);

module.exports = router;
