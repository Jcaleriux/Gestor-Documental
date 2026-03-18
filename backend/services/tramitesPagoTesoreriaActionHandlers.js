const { FACTURA_ESTADOS } = require('../domain/facturas');
const { TRAMITE_ESTADOS } = require('../domain/tramitesPago');
const { assertFound } = require('../utils/errors');
const {
  ensureFacturaNoPagadaForTesoreria,
  resolveFacturaEstadoOrigen,
  excludeDocumentoEnTesoreria,
  devolverDocumentoAContabilidad
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

    const documento = await tramitesPagoRepo.getTramiteDocumentoByFacturaIdForUpdate({
      tramiteId: id,
      facturaId
    }, client);
    assertFound(documento, 'Documento no encontrado en tramite');

    return excludeDocumentoEnTesoreria({
      tramitesPagoRepo,
      tramiteId: id,
      facturaId,
      motivo,
      usuario,
      estadoAnterior,
      estadoFacturaDestino: resolveFacturaEstadoOrigen(documento),
      client
    });
  };

  const returnToAccounting = async ({
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

    const documento = await tramitesPagoRepo.getTramiteDocumentoByFacturaIdForUpdate({
      tramiteId: id,
      facturaId
    }, client);
    assertFound(documento, 'Documento no encontrado en tramite');

    return devolverDocumentoAContabilidad({
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

    if (destino === TRAMITE_ESTADOS.EN_APROBACION_GERENCIA) {
      await tramitesPagoRepo.resetTramiteDocumentoAprobadores({
        tramiteId: id,
        facturaId
      }, client);
    }

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
    returnToAccounting,
    reset
  });
};

const resolveTesoreriaActionHandler = ({ handlers, handlerType }) => handlers[handlerType] || null;

module.exports = {
  createTesoreriaActionHandlers,
  resolveTesoreriaActionHandler
};
