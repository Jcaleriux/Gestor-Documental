const { FACTURA_ESTADOS } = require('../domain/facturas');
const { assertFound } = require('../utils/errors');
const {
  ensureFacturaNoPagadaForTesoreria,
  excludeDocumentoEnTesoreria
} = require('./tramitesPagoUseCases.helpers');

const createTesoreriaActionHandlers = ({ tramitesPagoRepo }) => {
  const exclude = async ({
    id,
    facturaId,
    motivo,
    usuario,
    estadoAnterior,
    client
  }) => {
    await ensureFacturaNoPagadaForTesoreria({
      tramitesPagoRepo,
      facturaId,
      client
    });

    return excludeDocumentoEnTesoreria({
      tramitesPagoRepo,
      tramiteId: id,
      facturaId,
      motivo,
      usuario,
      estadoAnterior,
      client
    });
  };

  const reset = async ({
    id,
    facturaId,
    destino,
    motivo,
    usuario,
    estadoAnterior,
    actionPolicy,
    client
  }) => {
    const result = await tramitesPagoRepo.updateDocumentoTesoreriaReset({
      destino,
      estadoTesoreria: actionPolicy.estadoTesoreria,
      motivo,
      tramiteId: id,
      facturaId
    }, client);

    assertFound(result, 'Documento no encontrado en tramite');

    await tramitesPagoRepo.updateFacturaEstado({
      facturaId,
      estado: FACTURA_ESTADOS.EN_TRAMITE_PAGO
    }, client);

    await tramitesPagoRepo.updateTramiteEstado({
      tramiteId: id,
      estado: destino
    }, client);

    await tramitesPagoRepo.insertHistorialDocumentoConEstados({
      tramiteId: id,
      facturaId,
      accion: actionPolicy.accionHistorial,
      estadoAnterior,
      estadoNuevo: destino,
      usuario,
      motivo
    }, client);

    return result;
  };

  return Object.freeze({
    exclude,
    reset
  });
};

const resolveTesoreriaActionHandler = ({ handlers, handlerType }) => handlers[handlerType] || null;

module.exports = {
  createTesoreriaActionHandlers,
  resolveTesoreriaActionHandler
};
