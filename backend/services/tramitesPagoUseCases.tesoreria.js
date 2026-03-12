const {
  validateAccionTesoreriaInput,
  validateAccionTesoreriaEstado
} = require('./tramitesPagoRules');
const { assertFound, throwIfValidationError } = require('../utils/errors');
const { resolveTesoreriaActionPolicy } = require('./tramitesPagoTesoreriaPolicies');
const {
  createTesoreriaActionHandlers,
  resolveTesoreriaActionHandler
} = require('./tramitesPagoTesoreriaActionHandlers');
const {
  loadTramiteEstadoOrFail,
  parsePositiveIntOrThrow,
  toNormalizedLowerString
} = require('./tramitesPagoUseCases.helpers');

const createTramitesPagoTesoreriaUseCases = ({ tramitesPagoRepo, runInTransaction, policyRegistry }) => {
  const resolveActionPolicy = policyRegistry?.tesoreria?.resolveActionPolicy || resolveTesoreriaActionPolicy;
  const fallbackActionHandlers = createTesoreriaActionHandlers({ tramitesPagoRepo });
  const resolveActionHandler = policyRegistry?.tesoreria?.resolveActionHandler
    || ((handlerType) => resolveTesoreriaActionHandler({
      handlers: fallbackActionHandlers,
      handlerType
    }));

  const rechazoTesoreria = async ({ id, facturaId, motivo, usuario }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const normalizedFacturaId = parsePositiveIntOrThrow(facturaId, 'facturaId');
    const excludeHandler = resolveActionHandler('exclude');
    if (!excludeHandler) {
      throwIfValidationError({ status: 500, error: 'handler tesoreria exclude no configurado' });
    }

    return runInTransaction(async (client) => {
      const tramite = await loadTramiteEstadoOrFail({
        tramitesPagoRepo,
        tramiteId,
        client
      });

      return excludeHandler({
        id: tramiteId,
        facturaId: normalizedFacturaId,
        motivo,
        usuario,
        estadoAnterior: tramite.estado || null,
        client
      });
    });
  };

  const accionTesoreria = async ({ id, facturaId, accion, destino, motivo, usuario }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const normalizedFacturaId = parsePositiveIntOrThrow(facturaId, 'facturaId');
    const accionNormalizada = toNormalizedLowerString(accion);
    const destinoNormalizado = destino ? toNormalizedLowerString(destino) : undefined;

    throwIfValidationError(validateAccionTesoreriaInput(accionNormalizada, destinoNormalizado));
    const actionPolicy = resolveActionPolicy(accionNormalizada);
    const actionHandler = actionPolicy ? resolveActionHandler(actionPolicy.handlerType) : null;
    if (!actionHandler) {
      throwIfValidationError({ status: 400, error: 'accion invalida' });
    }

    return runInTransaction(async (client) => {
      const tramite = await loadTramiteEstadoOrFail({
        tramitesPagoRepo,
        tramiteId,
        client
      });
      const estadoAnterior = tramite.estado;

      const doc = await tramitesPagoRepo.getDocumentoTesoreriaEstado(tramiteId, normalizedFacturaId, client);
      assertFound(doc, 'Documento no encontrado en tramite');
      const estadoTesActual = doc.estado_tesoreria;

      throwIfValidationError(validateAccionTesoreriaEstado(accionNormalizada, estadoTesActual));

      return actionHandler({
        id: tramiteId,
        facturaId: normalizedFacturaId,
        destino: destinoNormalizado,
        motivo,
        usuario,
        estadoAnterior,
        actionPolicy,
        client
      });
    });
  };

  return {
    rechazoTesoreria,
    accionTesoreria
  };
};

module.exports = { createTramitesPagoTesoreriaUseCases };
