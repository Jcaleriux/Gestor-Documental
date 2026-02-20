const { validateFacturaNoPagada } = require('./tramitesPagoRules');
const { DOCUMENTO_ACCIONES } = require('../domain/tramitesPago');
const { FACTURA_ESTADOS } = require('../domain/facturas');
const { createError, assertFound, throwIfValidationError } = require('../utils/errors');

const normalizeUniquePositiveIds = (values) => {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  return Array.from(new Set(normalized));
};

const normalizePagosDocumentos = (values) => {
  if (!Array.isArray(values)) return [];

  const normalized = [];
  values.forEach((entry) => {
    const facturaId = Number(entry?.factura_id);
    const montoPago = Number(entry?.monto_pago);
    if (!Number.isInteger(facturaId) || facturaId <= 0) {
      return;
    }
    if (!Number.isFinite(montoPago)) {
      return;
    }
    normalized.push({
      facturaId,
      montoPago
    });
  });

  const uniqueByFactura = new Map();
  normalized.forEach((item) => {
    uniqueByFactura.set(item.facturaId, item);
  });

  return Array.from(uniqueByFactura.values());
};

const PAGO_MONTO_EPSILON = 0.0001;

const REQUIRED_REPO_METHODS = [
  'getClient',
  'getTramiteEstado',
  'getTramiteById',
  'getFacturaEstado',
  'getDocumentoTesoreriaEstado',
  'updateDocumentoTesoreriaExcluido',
  'updateDocumentoTesoreriaReset',
  'updateDocumentoTesoreriaPendiente',
  'updateDocumentoDecision',
  'updateFacturaEstado',
  'updateFacturasEstadoByIds',
  'updateFacturasEstadoPorSaldoByTramite',
  'updateTramiteEstado',
  'insertHistorialDocumentoConEstados',
  'insertHistorialConEstados',
  'insertHistorialDocumento',
  'insertHistorialTramite',
  'insertPagoFactura',
  'touchTramite',
  'listTramites',
  'getRetencionesDisponibles',
  'listDocumentosByTramite',
  'listRetencionesByTramite',
  'listHistorialByTramite',
  'getFacturasByIds',
  'getRetencionesPendientesByFacturaIds',
  'findDuplicadosActivos',
  'findRetencionesDuplicadasActivas',
  'insertTramite',
  'insertTramiteDocumentos',
  'insertTramiteRetenciones',
  'countRechazadosActivos',
  'listSaldosPagoPrincipalByTramite',
  'applyRetencionesPagadasByTramite'
];

const assertRepoContract = (repo) => {
  const missingMethods = REQUIRED_REPO_METHODS.filter((methodName) => typeof repo?.[methodName] !== 'function');
  if (missingMethods.length > 0) {
    throw new Error(`tramitesPagoRepo incompleto: faltan ${missingMethods.join(', ')}`);
  }
};

const loadTramiteEstadoOrFail = async ({ tramitesPagoRepo, tramiteId, client }) => {
  const tramite = await tramitesPagoRepo.getTramiteEstado(tramiteId, client);
  assertFound(tramite, 'Tramite no encontrado');
  return tramite;
};

const ensureFacturaNoPagadaForTesoreria = async ({ tramitesPagoRepo, facturaId, client }) => {
  const factura = await tramitesPagoRepo.getFacturaEstado(facturaId, client);
  assertFound(factura, 'Factura no encontrada');
  throwIfValidationError(validateFacturaNoPagada(factura.estado));
};

const excludeDocumentoEnTesoreria = async ({
  tramitesPagoRepo,
  tramiteId,
  facturaId,
  motivo,
  usuario,
  estadoAnterior,
  client
}) => {
  const result = await tramitesPagoRepo.updateDocumentoTesoreriaExcluido({
    tramiteId,
    facturaId,
    motivo
  }, client);

  assertFound(result, 'Documento no encontrado en tramite');

  await tramitesPagoRepo.updateFacturaEstado({
    facturaId,
    estado: FACTURA_ESTADOS.EN_REVISION
  }, client);

  await tramitesPagoRepo.insertHistorialDocumentoConEstados({
    tramiteId,
    facturaId,
    accion: DOCUMENTO_ACCIONES.TESORERIA_EXCLUIR,
    estadoAnterior,
    estadoNuevo: estadoAnterior,
    usuario,
    motivo
  }, client);

  await tramitesPagoRepo.touchTramite(tramiteId, client);

  return result;
};

const buildSaldosByFactura = (saldosRows) => new Map(
  (saldosRows || []).map((row) => [Number(row.factura_id), Number(row.saldo_pago_principal || 0)])
);

const validatePagosInputBySaldos = (pagosInput, saldosByFactura) => {
  for (const pagoInput of pagosInput) {
    if (!saldosByFactura.has(pagoInput.facturaId)) {
      throw createError(400, `La factura ${pagoInput.facturaId} no pertenece al tramite activo`);
    }
    if (!Number.isFinite(pagoInput.montoPago) || pagoInput.montoPago <= 0) {
      throw createError(400, `Monto de pago invalido para factura ${pagoInput.facturaId}`);
    }
    const saldoFactura = Number(saldosByFactura.get(pagoInput.facturaId) || 0);
    if (pagoInput.montoPago > saldoFactura + PAGO_MONTO_EPSILON) {
      throw createError(
        400,
        `El monto de pago para factura ${pagoInput.facturaId} excede el saldo pendiente`
      );
    }
  }
};

const registrarPagosPrincipales = async ({
  tramitesPagoRepo,
  tramiteId,
  usuario,
  pagosInput,
  saldosByFactura,
  client
}) => {
  const pagosInputByFactura = new Map(pagosInput.map((item) => [item.facturaId, item.montoPago]));

  for (const [facturaId, saldoRaw] of saldosByFactura.entries()) {
    const saldoFactura = Number(saldoRaw || 0);
    if (!Number.isFinite(saldoFactura) || saldoFactura <= 0) {
      continue;
    }

    const montoPago = pagosInputByFactura.has(facturaId)
      ? Number(pagosInputByFactura.get(facturaId))
      : saldoFactura;

    if (!Number.isFinite(montoPago) || montoPago <= 0) {
      continue;
    }

    await tramitesPagoRepo.insertPagoFactura({
      facturaId,
      tramiteId,
      monto: montoPago,
      fechaPago: null,
      usuario,
      notas: `Pago principal en tramite #${tramiteId}`
    }, client);
  }
};

module.exports = {
  normalizeUniquePositiveIds,
  normalizePagosDocumentos,
  REQUIRED_REPO_METHODS,
  assertRepoContract,
  loadTramiteEstadoOrFail,
  ensureFacturaNoPagadaForTesoreria,
  excludeDocumentoEnTesoreria,
  buildSaldosByFactura,
  validatePagosInputBySaldos,
  registrarPagosPrincipales
};
