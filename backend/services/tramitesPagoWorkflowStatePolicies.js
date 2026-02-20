const { TRAMITE_ESTADOS } = require('../domain/tramitesPago');
const { validatePagadoSinRechazos } = require('./tramitesPagoRules');
const { throwIfValidationError } = require('../utils/errors');
const {
  normalizePagosDocumentos,
  buildSaldosByFactura,
  validatePagosInputBySaldos,
  registrarPagosPrincipales
} = require('./tramitesPagoUseCases.helpers');

const NO_OP_STATE_POLICY = Object.freeze({
  validateBeforeUpdate: async () => {},
  runAfterUpdate: async () => {}
});

const createPagadoStatePolicy = ({ tramitesPagoRepo }) => ({
  validateBeforeUpdate: async ({ tramiteId, sameNormalized, client }) => {
    if (sameNormalized) {
      return;
    }

    const totalRechazados = await tramitesPagoRepo.countRechazadosActivos(tramiteId, client);
    throwIfValidationError(validatePagadoSinRechazos(totalRechazados));
  },
  runAfterUpdate: async ({ tramiteId, usuario, pagosDocumentos, client }) => {
    const saldosRows = await tramitesPagoRepo.listSaldosPagoPrincipalByTramite(tramiteId, client);
    const saldosByFactura = buildSaldosByFactura(saldosRows);
    const pagosInput = normalizePagosDocumentos(pagosDocumentos);
    validatePagosInputBySaldos(pagosInput, saldosByFactura);

    await registrarPagosPrincipales({
      tramitesPagoRepo,
      tramiteId,
      usuario,
      pagosInput,
      saldosByFactura,
      client
    });

    await tramitesPagoRepo.updateFacturasEstadoPorSaldoByTramite(tramiteId, client);
    await tramitesPagoRepo.applyRetencionesPagadasByTramite({
      tramiteId,
      usuario
    }, client);
  }
});

const createCambioEstadoPolicies = ({ tramitesPagoRepo }) => Object.freeze({
  [TRAMITE_ESTADOS.PAGADO]: createPagadoStatePolicy({ tramitesPagoRepo })
});

const resolveCambioEstadoPolicy = ({ policies, estadoDestino }) => (
  policies[estadoDestino] || NO_OP_STATE_POLICY
);

module.exports = {
  createCambioEstadoPolicies,
  resolveCambioEstadoPolicy
};
