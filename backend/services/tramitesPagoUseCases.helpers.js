const { validateFacturaNoPagada } = require('./tramitesPagoRules');
const { DOCUMENTO_ACCIONES, TESORERIA_ESTADOS } = require('../domain/tramitesPago');
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

const toNormalizedLowerString = (value) => (value ?? '').toString().trim().toLowerCase();

const parsePositiveIntOrThrow = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const parseOptionalPositiveIntOrThrow = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return parsePositiveIntOrThrow(value, fieldName);
};

const PAGO_MONTO_EPSILON = 0.0001;
const PAGO_DISPLAY_DECIMALS = 2;

const roundPagoForDisplay = (value) => Number(Number(value || 0).toFixed(PAGO_DISPLAY_DECIMALS));

const alignMontoPagoToSaldo = ({ montoPago, saldoFactura }) => {
  if (!Number.isFinite(montoPago) || !Number.isFinite(saldoFactura)) {
    return montoPago;
  }

  if (montoPago - saldoFactura <= PAGO_MONTO_EPSILON) {
    return montoPago;
  }

  if (roundPagoForDisplay(montoPago) === roundPagoForDisplay(saldoFactura)) {
    return saldoFactura;
  }

  return montoPago;
};

const alignPagosInputToSaldos = (pagosInput, saldosByFactura) => (
  (Array.isArray(pagosInput) ? pagosInput : []).map((item) => {
    const saldoFactura = Number(saldosByFactura.get(item.facturaId) || 0);
    return {
      ...item,
      montoPago: alignMontoPagoToSaldo({
        montoPago: Number(item.montoPago),
        saldoFactura
      })
    };
  })
);

const REQUIRED_REPO_METHODS = [
  'getClient',
  'getTramiteEstado',
  'getTramiteById',
  'getSociedadById',
  'getTramiteByIdForUpdate',
  'getTramiteCaratulaByTramiteId',
  'upsertTramiteCaratula',
  'getFacturaEstado',
  'getDocumentoTesoreriaEstado',
  'getTramiteDocumentoByFacturaIdForUpdate',
  'updateDocumentoTesoreriaExcluido',
  'updateDocumentoTesoreriaReset',
  'updateDocumentoTesoreriaPendiente',
  'updateDocumentosTesoreriaEstadoByTramite',
  'updateRetencionesTesoreriaEstadoByTramite',
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
  'listCentroCostoAprobadoresByFacturaIds',
  'getRetencionesPendientesByFacturaIds',
  'findDuplicadosActivos',
  'findRetencionesDuplicadasActivas',
  'insertTramite',
  'insertTramiteDocumentos',
  'insertTramiteDocumentoAprobadores',
  'listTramiteDocumentoAprobadores',
  'listTramiteDocumentoAprobadoresForUpdate',
  'updateTramiteDocumentoAprobadorEstado',
  'resetTramiteDocumentoAprobadores',
  'insertTramiteRetenciones',
  'countRechazadosActivos',
  'getResumenEtapaDocumentos',
  'listSaldosPagoPrincipalByTramite',
  'updateMontosPagoProgramadoByTramite',
  'applyRetencionesPagadasByTramite'
];

const assertRepoContract = (repo) => {
  const missingMethods = REQUIRED_REPO_METHODS.filter((methodName) => typeof repo?.[methodName] !== 'function');
  if (missingMethods.length > 0) {
    throw new Error(`tramitesPagoRepo incompleto: faltan ${missingMethods.join(', ')}`);
  }
};

const callOptionalRepoMethod = async ({
  repo,
  methodName,
  args = [],
  defaultValue = []
}) => {
  if (typeof repo?.[methodName] !== 'function') {
    return defaultValue;
  }

  return repo[methodName](...args);
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

const ESTADOS_FACTURA_RESTAURABLES = new Set([
  FACTURA_ESTADOS.CONTABILIZADO,
  FACTURA_ESTADOS.PAGADO_PARCIALMENTE
]);

const resolveFacturaEstadoOrigen = (documentoRow) => {
  const estadoFacturaOrigen = toNormalizedLowerString(documentoRow?.estado_factura_origen);
  if (ESTADOS_FACTURA_RESTAURABLES.has(estadoFacturaOrigen)) {
    return estadoFacturaOrigen;
  }
  return FACTURA_ESTADOS.CONTABILIZADO;
};

const excludeDocumentoEnTesoreria = async ({
  tramitesPagoRepo,
  tramiteId,
  facturaId,
  motivo,
  usuario,
  estadoAnterior,
  estadoFacturaDestino,
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
    estado: estadoFacturaDestino
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

const devolverDocumentoAContabilidad = async ({
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
    motivo,
    estadoTesoreria: TESORERIA_ESTADOS.DEVUELTO_CONTABILIDAD
  }, client);

  assertFound(result, 'Documento no encontrado en tramite');

  await tramitesPagoRepo.updateFacturaEstado({
    facturaId,
    estado: FACTURA_ESTADOS.EN_REVISION
  }, client);

  await tramitesPagoRepo.insertHistorialDocumentoConEstados({
    tramiteId,
    facturaId,
    accion: DOCUMENTO_ACCIONES.TESORERIA_DEVOLVER_CONTABILIDAD,
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

const buildPagosProgramadosByFactura = (saldosRows) => {
  const pagosProgramados = [];

  (saldosRows || []).forEach((row) => {
    const facturaId = Number(row?.factura_id);
    const montoPago = Number(row?.monto_pago_programado);
    if (!Number.isInteger(facturaId) || facturaId <= 0) {
      return;
    }
    if (!Number.isFinite(montoPago) || montoPago <= 0) {
      return;
    }

    pagosProgramados.push({
      facturaId,
      montoPago
    });
  });

  return pagosProgramados;
};

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
  toNormalizedLowerString,
  parsePositiveIntOrThrow,
  parseOptionalPositiveIntOrThrow,
  REQUIRED_REPO_METHODS,
  assertRepoContract,
  callOptionalRepoMethod,
  loadTramiteEstadoOrFail,
  ensureFacturaNoPagadaForTesoreria,
  resolveFacturaEstadoOrigen,
  excludeDocumentoEnTesoreria,
  devolverDocumentoAContabilidad,
  buildSaldosByFactura,
  buildPagosProgramadosByFactura,
  alignMontoPagoToSaldo,
  alignPagosInputToSaldos,
  validatePagosInputBySaldos,
  registrarPagosPrincipales
};
