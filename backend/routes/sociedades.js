const express = require('express');
const {
  listSociedades,
  listSociedadesAdmin,
  createSociedad,
  updateSociedad
} = require('../services/sociedadesService');
const { requireAnyPermission, requirePermission } = require('../middleware/permissionsMiddleware');
const { PERMISSIONS, SOCIEDADES_ACCESS_PERMISSIONS } = require('../domain/permissions');
const { validateBody } = require('../middleware/validate');
const { createSociedadSchema, updateSociedadSchema } = require('../validation/schemas');

const router = express.Router({ mergeParams: true });

router.get('/sociedades', requireAnyPermission(SOCIEDADES_ACCESS_PERMISSIONS), listSociedades);
router.get('/sociedades/admin', requirePermission(PERMISSIONS.SOCIEDADES_ADMINISTRAR), listSociedadesAdmin);
router.post(
  '/sociedades',
  requirePermission(PERMISSIONS.SOCIEDADES_ADMINISTRAR),
  validateBody(createSociedadSchema, { message: 'Datos de sociedad invalidos' }),
  createSociedad
);
router.patch(
  '/sociedades/:id',
  requirePermission(PERMISSIONS.SOCIEDADES_ADMINISTRAR),
  validateBody(updateSociedadSchema, { message: 'Datos de sociedad invalidos' }),
  updateSociedad
);

module.exports = router;
