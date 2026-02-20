const express = require('express');
const { handleRequest } = require('../utils/http');
const { validateBody } = require('../middleware/validate');
const { requirePermission } = require('../middleware/permissionsMiddleware');
const {
  upsertContabilizacionSchema,
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
    return useCases.getContabilizacion({ facturaId });
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
    centro_costo,
    cuenta_contable,
    proyecto,
    orden_compra,
    numero_proveedor,
    proveedor_id,
    tabla_pago_id,
    nota_credito_id,
    notas,
    metadata,
    usuario
  } = req.body || {};
  const actorUsuario = usuario || req.user?.email || 'system';

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
    centro_costo,
    cuenta_contable,
    proyecto,
    orden_compra,
    numero_proveedor,
    proveedor_id,
    tabla_pago_id,
    nota_credito_id,
    notas,
    metadata,
    usuario: actorUsuario
  });
  }, 'Error saving contabilizacion:', 'Error saving contabilizacion')
);

router.post(
  '/facturas/:facturaId/contabilizacion/retencion-pagos',
  requirePermission(PERMISSIONS.DOCUMENTOS_CONTABILIZAR),
  validateBody(registrarPagoRetencionSchema),
  handleRequest(async (req) => {
    const { facturaId } = req.params;
    const { monto, fecha_pago, notas, usuario } = req.body || {};
    const actorUsuario = usuario || req.user?.email || 'system';

    return useCases.registrarPagoRetencion({
      facturaId,
      monto,
      fecha_pago,
      notas,
      usuario: actorUsuario
    });
  }, 'Error saving retencion payment:', 'Error saving retencion payment')
);

module.exports = router;
