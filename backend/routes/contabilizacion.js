const express = require('express');
const { handleRequest } = require('../utils/http');
const { validateBody } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const {
  upsertContabilizacionSchema,
  uploadContabilizacionDocumentoRespaldoSchema,
  registrarPagoRetencionSchema
} = require('../validation/schemas');
const { createContabilizacionUseCases } = require('../services/contabilizacionUseCases');
const contabilizacionRepo = require('../repositories/contabilizacionRepository');
const { PERMISSIONS } = require('../domain/permissions');

const router = express.Router({ mergeParams: true });

const useCases = createContabilizacionUseCases({ contabilizacionRepo });

// GET contabilizacion de factura
router.get(
  '/facturas/:facturaId/contabilizacion',
  requirePermission(PERMISSIONS.DOCUMENTOS_VER),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    return useCases.getContabilizacion({ facturaId, user: req.user });
  }, 'Error fetching contabilizacion:', 'Error fetching contabilizacion')
);

// POST upsert contabilizacion de factura
router.post(
  '/facturas/:facturaId/contabilizacion',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  validateBody(upsertContabilizacionSchema),
  handleRequest(async (req) => {
  const { facturaId } = req.params;
  const {
    fecha_documento,
    fecha_vencimiento,
    fecha_contabilizacion,
    plazo_credito,
    retencion,
    descuento,
    anticipo_aplicado,
    monto_nota_credito,
    asiento,
    centro_costo,
    cuenta_contable,
    proyecto,
    orden_compra,
    orden_compra_id,
    numero_proveedor,
    proveedor_id,
    tabla_pago_id,
    nota_credito_id,
    notas,
    workflow_action,
    metadata,
    usuario
  } = req.body || {};
  const actorUsuario = req.user?.email || usuario || 'system';

  return useCases.upsertContabilizacion({
    facturaId,
    fecha_documento,
    fecha_vencimiento,
    fecha_contabilizacion,
    plazo_credito,
    retencion,
    descuento,
    anticipo_aplicado,
    monto_nota_credito,
    asiento,
    centro_costo,
    cuenta_contable,
    proyecto,
    orden_compra,
    orden_compra_id,
    numero_proveedor,
    proveedor_id,
    tabla_pago_id,
    nota_credito_id,
    notas,
    workflow_action,
    metadata,
    usuario: actorUsuario,
    user: req.user
  });
  }, 'Error saving contabilizacion:', 'Error saving contabilizacion')
);

router.post(
  '/facturas/:facturaId/contabilizacion/documentos-respaldo',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  validateBody(uploadContabilizacionDocumentoRespaldoSchema),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { filename, file_base64, metadata, usuario } = req.body || {};
    const actorUsuario = req.user?.email || usuario || 'system';

    return useCases.uploadDocumentoRespaldo({
      facturaId,
      filename,
      file_base64,
      metadata,
      usuario: actorUsuario,
      user: req.user
    });
  }, 'Error uploading contabilizacion support document:', 'Error uploading contabilizacion support document')
);

router.delete(
  '/facturas/:facturaId/contabilizacion/documentos-respaldo/:documentoId',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  handleRequest(async (req) => {
    const { facturaId, documentoId } = req.params;

    return useCases.deleteDocumentoRespaldo({
      facturaId,
      documentoId,
      user: req.user
    });
  }, 'Error deleting contabilizacion support document:', 'Error deleting contabilizacion support document')
);

router.post(
  '/facturas/:facturaId/contabilizacion/retencion-pagos',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  validateBody(registrarPagoRetencionSchema),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { monto, fecha_pago, notas, usuario } = req.body || {};
    const actorUsuario = req.user?.email || usuario || 'system';

    return useCases.registrarPagoRetencion({
      facturaId,
      monto,
      fecha_pago,
      notas,
      usuario: actorUsuario,
      user: req.user
    });
  }, 'Error saving retencion payment:', 'Error saving retencion payment')
);

module.exports = router;
