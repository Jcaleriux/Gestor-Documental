const express = require('express');
const { requireAnyPermission, requirePermission } = require('../middleware/permissionsMiddleware');
const { validateBody } = require('../middleware/validate');
const { PERMISSIONS } = require('../domain/permissions');
const {
  createCentroCostoSchema,
  updateCentroCostoSchema,
  bulkUpsertCentrosCostoSchema,
} = require('../validation/schemas');
const {
  listCentrosCosto,
  createCentroCosto,
  updateCentroCosto,
  bulkUpsertCentrosCosto,
} = require('../services/centrosCostoService');

const router = express.Router({ mergeParams: true });

router.get(
  '/centros-costo',
  requireAnyPermission([
    PERMISSIONS.USUARIOS_ADMINISTRAR,
    PERMISSIONS.DOCUMENTOS_CONTABILIZAR,
    PERMISSIONS.DOCUMENTOS_VER,
  ]),
  listCentrosCosto
);

router.post(
  '/centros-costo',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(createCentroCostoSchema, { message: 'Datos de centro de costo invalidos' }),
  createCentroCosto
);

router.put(
  '/centros-costo/bulk',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(bulkUpsertCentrosCostoSchema, { message: 'Carga masiva de centros de costo invalida' }),
  bulkUpsertCentrosCosto
);

router.patch(
  '/centros-costo/:id',
  requirePermission(PERMISSIONS.USUARIOS_ADMINISTRAR),
  validateBody(updateCentroCostoSchema, { message: 'Datos de centro de costo invalidos' }),
  updateCentroCosto
);

module.exports = router;
