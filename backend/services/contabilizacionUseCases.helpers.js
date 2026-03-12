const { createError } = require('../utils/errors');
const { mapContabilizacionRow } = require('../mappers/contabilizacionMapper');

const REQUIRED_REPO_METHODS = [
  'getClient',
  'getContabilizacionByFacturaId',
  'listRetencionPagosByFacturaId',
  'getFacturaById',
  'getProveedorById',
  'getProveedorBySociedadAndIdentificacion',
  'getTablaPagoById',
  'getOrdenCompraById',
  'getNotaCreditoById',
  'getContabilizacionRetencionByFacturaIdForUpdate',
  'normalizeRetencionStateByFacturaId',
  'upsertContabilizacion',
  'insertRetencionPago',
  'applyRetencionPago',
  'updateFacturaEstado',
  'insertEstadoDocumento',
  'refreshEstadoOrdenCompraById'
];

const normalizeIdentification = (value) => String(value || '')
  .replace(/[^0-9A-Za-z]/g, '')
  .toUpperCase();

const toOptionalNonNegativeNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createError(400, `${fieldName} invalido`);
  }

  return parsed;
};

const toRequiredPositiveNumber = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const toDateOnlyOrToday = (value) => {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createError(400, 'fecha_pago invalida');
  }
  return date.toISOString().slice(0, 10);
};

const assertRepoContract = (repo) => {
  const missingMethods = REQUIRED_REPO_METHODS.filter((methodName) => typeof repo?.[methodName] !== 'function');
  if (missingMethods.length > 0) {
    throw new Error(`contabilizacionRepo incompleto: faltan ${missingMethods.join(', ')}`);
  }
};

const mapContabilizacionWithPayments = async ({ contabilizacionRepo, facturaId, client }) => {
  const row = await contabilizacionRepo.getContabilizacionByFacturaId(facturaId, client);
  if (!row) {
    return null;
  }

  const retencionPagos = await contabilizacionRepo.listRetencionPagosByFacturaId(facturaId, client);

  return mapContabilizacionRow({
    ...row,
    retencion_pagos: retencionPagos
  });
};

const ensureFacturaById = async ({ contabilizacionRepo, facturaId, client }) => {
  const factura = await contabilizacionRepo.getFacturaById(facturaId, client);
  if (!factura) {
    throw createError(404, 'Factura no encontrada');
  }
  return factura;
};

const ensureProveedorById = async ({ contabilizacionRepo, proveedorId, sociedadId, client }) => {
  const proveedor = await contabilizacionRepo.getProveedorById(proveedorId, client);
  if (!proveedor || Number(proveedor.sociedad_id) !== sociedadId) {
    throw createError(400, 'Proveedor invalido para la sociedad de la factura');
  }
  return proveedor;
};

module.exports = {
  REQUIRED_REPO_METHODS,
  normalizeIdentification,
  toOptionalNonNegativeNumber,
  toRequiredPositiveNumber,
  toDateOnlyOrToday,
  assertRepoContract,
  mapContabilizacionWithPayments,
  ensureFacturaById,
  ensureProveedorById
};
