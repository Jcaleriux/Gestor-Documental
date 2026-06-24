const express = require('express');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const {
  listFacturas,
  listRetencionesPendientes,
  getFactura,
  getFacturasPdfSeleccionadas,
  getMensajeHacienda,
  getManifest,
  getNotaCreditoManifest,
  listNotasCredito,
  listTiquetesElectronicos,
  listMensajesHacienda
} = require('../services/facturasService');
const { PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

router.get('/facturas', requirePermission(PERMISSIONS.DOCUMENTOS_VER), listFacturas);
router.post('/facturas/pdf-seleccionadas', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getFacturasPdfSeleccionadas);
router.get('/retenciones-pendientes', requirePermission(PERMISSIONS.DOCUMENTOS_VER), listRetencionesPendientes);
router.get('/facturas/:id', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getFactura);
router.get('/facturas/:id/mensaje-hacienda', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getMensajeHacienda);
router.get('/facturas/:id/manifest', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getManifest);
router.get('/notas-credito', requirePermission(PERMISSIONS.DOCUMENTOS_VER), listNotasCredito);
router.get('/notas-credito/:id/manifest', requirePermission(PERMISSIONS.DOCUMENTOS_VER), getNotaCreditoManifest);
router.get('/tiquetes-electronicos', requirePermission(PERMISSIONS.DOCUMENTOS_VER), listTiquetesElectronicos);
router.get('/mensajes-hacienda', requirePermission(PERMISSIONS.DOCUMENTOS_VER), listMensajesHacienda);

module.exports = router;
