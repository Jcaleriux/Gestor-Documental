const { withTransaction } = require('../../db/withTransaction');
const { createError } = require('../../utils/errors');
const { ensureSociedadAccess, toPositiveInt } = require('../sociedadAccessService');

const REQUIRED_REPO_METHODS = Object.freeze([
  'getClient',
  'getSociedadByCodigo',
  'upsertUnidad',
  'findActiveOperacionByUnidadId',
  'getOperacionById',
  'listOperaciones',
  'createOperacion',
  'updateOperacionEstado',
  'insertOperacionHistorial',
  'listOperacionHistorial',
  'listOperacionDocumentos',
  'getOperacionDocumentoById',
  'upsertOperacionDocumento',
]);

const normalizeCode = (value, fieldName) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    throw createError(400, `${fieldName} requerido`);
  }

  return normalized;
};

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeRequiredText = (value, fieldName) => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, `${fieldName} requerido`);
  }

  return normalized;
};

const normalizeOptionalInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createError(400, `${fieldName} invalido`);
  }

  return parsed;
};

const resolveActor = ({ user, usuario }) => (
  normalizeOptionalText(usuario) || user?.email || user?.nombre || null
);

const withSchemaGuard = async (handler) => {
  try {
    return await handler();
  } catch (error) {
    if (error?.code === '42P01' || error?.code === '42703') {
      throw createError(500, 'Falta la migracion de reservas. Ejecute: npm run db:migrate:reservas');
    }

    throw error;
  }
};

const assertRepoContract = (reservasRepo) => {
  const missing = REQUIRED_REPO_METHODS.filter((method) => typeof reservasRepo?.[method] !== 'function');
  if (missing.length > 0) {
    throw new Error(`reservasRepo incompleto: faltan ${missing.join(', ')}`);
  }
};

const createReservasSharedContext = ({ reservasRepo }) => {
  const runInTransaction = (handler) => withTransaction(() => reservasRepo.getClient(), handler);

  const resolveOperacionWithAccess = async ({ user, operacionId, client }) => {
    const operation = await reservasRepo.getOperacionById(operacionId, client);
    if (!operation) {
      throw createError(404, 'Reserva no encontrada');
    }

    await ensureSociedadAccess({
      user,
      sociedadId: operation.sociedad_id,
    });

    return operation;
  };

  const resolveOperacionDocumentoWithAccess = async ({
    user,
    operacionId,
    documentoId,
    client,
  }) => {
    const operation = await resolveOperacionWithAccess({ user, operacionId, client });
    const document = await reservasRepo.getOperacionDocumentoById(documentoId, client);
    if (!document || Number(document.operacion_id) !== Number(operation.id)) {
      throw createError(404, 'Documento de reserva no encontrado');
    }

    return {
      operation,
      document,
    };
  };

  const resolveSociedadIdByInput = async ({
    user,
    sociedadId,
    proyectoCodigo,
    client,
  }) => {
    if (sociedadId !== undefined && sociedadId !== null && sociedadId !== '') {
      return ensureSociedadAccess({ user, sociedadId });
    }

    const normalizedProjectCode = normalizeCode(proyectoCodigo, 'proyecto_codigo');
    const sociedad = await reservasRepo.getSociedadByCodigo(normalizedProjectCode, client);

    if (!sociedad || !sociedad.id) {
      throw createError(
        400,
        `No se encontro una sociedad para el proyecto ${normalizedProjectCode}`,
      );
    }

    return ensureSociedadAccess({ user, sociedadId: sociedad.id });
  };

  return {
    createError,
    ensureSociedadAccess,
    normalizeCode,
    normalizeOptionalInteger,
    normalizeOptionalText,
    normalizeRequiredText,
    resolveActor,
    resolveOperacionDocumentoWithAccess,
    resolveOperacionWithAccess,
    resolveSociedadIdByInput,
    runInTransaction,
    toPositiveInt,
    withSchemaGuard,
  };
};

module.exports = {
  assertRepoContract,
  createReservasSharedContext,
  normalizeCode,
  normalizeOptionalInteger,
  normalizeOptionalText,
  normalizeRequiredText,
  resolveActor,
  withSchemaGuard,
};
