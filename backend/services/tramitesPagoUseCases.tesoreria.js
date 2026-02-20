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
  loadTramiteEstadoOrFail
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
    const excludeHandler = resolveActionHandler('exclude');
    if (!excludeHandler) {
      throwIfValidationError({ status: 500, error: 'handler tesoreria exclude no configurado' });
    }

    return runInTransaction(async (client) => {
      const tramite = await loadTramiteEstadoOrFail({
        tramitesPagoRepo,
        tramiteId: id,
        client
      });

      return excludeHandler({
        id,
        facturaId,
        motivo,
        usuario,
        estadoAnterior: tramite.estado || null,
        client
      });
    });
  };

  const accionTesoreria = async ({ id, facturaId, accion, destino, motivo, usuario }) => {
    throwIfValidationError(validateAccionTesoreriaInput(accion, destino));
    const actionPolicy = resolveActionPolicy(accion);
    const actionHandler = actionPolicy ? resolveActionHandler(actionPolicy.handlerType) : null;
    if (!actionHandler) {
      throwIfValidationError({ status: 400, error: 'accion invalida' });
    }

    return runInTransaction(async (client) => {
      const tramite = await loadTramiteEstadoOrFail({
        tramitesPagoRepo,
        tramiteId: id,
        client
      });
      const estadoAnterior = tramite.estado;

      const doc = await tramitesPagoRepo.getDocumentoTesoreriaEstado(id, facturaId, client);
      assertFound(doc, 'Documento no encontrado en tramite');
      const estadoTesActual = doc.estado_tesoreria;

      throwIfValidationError(validateAccionTesoreriaEstado(accion, estadoTesActual));

      return actionHandler({
        id,
        facturaId,
        destino,
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
