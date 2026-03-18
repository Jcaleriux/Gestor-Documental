const { TRAMITE_ESTADOS, TRAMITE_ACCIONES } = require('../domain/tramitesPago');
const { assertFound, createError } = require('../utils/errors');

const TRAMITE_STATE_BY_ETAPA = Object.freeze({
  gerencia: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA,
  gerencia_contable: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE,
  financiera: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA
});

const NEXT_TRAMITE_STATE_BY_ETAPA = Object.freeze({
  gerencia: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE,
  gerencia_contable: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA
});

const toPositiveIntOrNull = (value) => {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

const normalizeFacturaIds = (facturaIds) => (
  Array.isArray(facturaIds)
    ? facturaIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
    : []
);

const ensureGerenciaApprovalSnapshots = async ({
  tramitesPagoRepo,
  tramiteId,
  facturaIds,
  client
}) => {
  const normalizedFacturaIds = normalizeFacturaIds(facturaIds);
  if (normalizedFacturaIds.length === 0) {
    return [];
  }

  const existingRows = await tramitesPagoRepo.listTramiteDocumentoAprobadores({
    tramiteId,
    facturaIds: normalizedFacturaIds
  }, client);

  const facturaIdsWithSnapshot = new Set(existingRows.map((row) => Number(row.factura_id)));
  const facturaIdsToSnapshot = normalizedFacturaIds.filter((facturaId) => !facturaIdsWithSnapshot.has(facturaId));

  if (facturaIdsToSnapshot.length === 0) {
    return existingRows;
  }

  const approverRows = await tramitesPagoRepo.listCentroCostoAprobadoresByFacturaIds(facturaIdsToSnapshot, client);
  if (approverRows.length > 0) {
    await tramitesPagoRepo.insertTramiteDocumentoAprobadores({
      tramiteId,
      aprobadores: approverRows
    }, client);
  }

  return tramitesPagoRepo.listTramiteDocumentoAprobadores({
    tramiteId,
    facturaIds: normalizedFacturaIds
  }, client);
};

const validateGerenciaApproverActor = ({ approvalRows, actorUserId }) => {
  const normalizedActorUserId = toPositiveIntOrNull(actorUserId);
  if (approvalRows.length === 0) {
    return null;
  }
  if (!normalizedActorUserId) {
    throw createError(403, 'Esta aprobacion requiere un usuario autenticado con asignacion de centro de costo');
  }

  const approvalRow = approvalRows.find((row) => Number(row.usuario_aprobador_id) === normalizedActorUserId) || null;
  if (!approvalRow) {
    throw createError(403, 'Este documento no esta asignado a tu gerencia segun sus centros de costo');
  }

  return approvalRow;
};

const buildApprovalSummary = (rows) => {
  const total = rows.length;
  const aprobados = rows.filter((row) => row.estado_gerencia === 'aprobado').length;
  const pendientes = rows.filter((row) => row.estado_gerencia === 'pendiente').length;
  const rechazados = rows.filter((row) => row.estado_gerencia === 'rechazado').length;

  return {
    total,
    aprobados,
    pendientes,
    rechazados
  };
};

const ensureEtapaReadyForAdvance = async ({
  tramitesPagoRepo,
  tramiteId,
  etapa,
  client
}) => {
  const summary = await tramitesPagoRepo.getResumenEtapaDocumentos({ tramiteId, etapa }, client);
  const totalActivos = Number(summary?.total_activos || 0);
  const aprobados = Number(summary?.aprobados || 0);
  const pendientes = Number(summary?.pendientes || 0);
  const rechazados = Number(summary?.rechazados || 0);

  if (rechazados > 0) {
    throw createError(400, 'No se puede avanzar con documentos rechazados en la etapa actual');
  }

  if (totalActivos === 0 || pendientes > 0 || aprobados < totalActivos) {
    throw createError(400, 'Aun hay documentos pendientes de aprobacion para esta etapa');
  }

  return {
    totalActivos,
    aprobados,
    pendientes,
    rechazados
  };
};

const maybeAdvanceTramiteByStageApproval = async ({
  tramitesPagoRepo,
  tramiteId,
  etapa,
  usuario,
  client
}) => {
  const expectedCurrentState = TRAMITE_STATE_BY_ETAPA[etapa];
  const nextState = NEXT_TRAMITE_STATE_BY_ETAPA[etapa];

  if (!expectedCurrentState || !nextState) {
    return false;
  }

  const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
  assertFound(tramite, 'Tramite no encontrado');

  if (tramite.estado !== expectedCurrentState) {
    return false;
  }

  try {
    await ensureEtapaReadyForAdvance({
      tramitesPagoRepo,
      tramiteId,
      etapa,
      client
    });
  } catch (error) {
    if (error?.status === 400) {
      return false;
    }
    throw error;
  }

  await tramitesPagoRepo.updateTramiteEstado({
    tramiteId,
    estado: nextState
  }, client);

  await tramitesPagoRepo.insertHistorialConEstados({
    tramiteId,
    accion: TRAMITE_ACCIONES.CAMBIAR_ESTADO,
    estadoAnterior: expectedCurrentState,
    estadoNuevo: nextState,
    usuario,
    motivo: null
  }, client);

  return true;
};

module.exports = {
  TRAMITE_STATE_BY_ETAPA,
  NEXT_TRAMITE_STATE_BY_ETAPA,
  ensureGerenciaApprovalSnapshots,
  validateGerenciaApproverActor,
  buildApprovalSummary,
  ensureEtapaReadyForAdvance,
  maybeAdvanceTramiteByStageApproval
};
