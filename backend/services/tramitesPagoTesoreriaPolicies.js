const {
  TESORERIA_ESTADOS,
  TESORERIA_ACCIONES,
  DOCUMENTO_ACCIONES
} = require('../domain/tramitesPago');

const validationError = (error) => ({ status: 400, error });

const TESORERIA_ACTION_POLICIES = Object.freeze({
  [TESORERIA_ACCIONES.EXCLUIR]: Object.freeze({
    handlerType: 'exclude',
    requiresDestino: false,
    validateEstadoTesoreria: () => null
  }),
  [TESORERIA_ACCIONES.REINCLUIR]: Object.freeze({
    handlerType: 'reset',
    requiresDestino: true,
    estadoTesoreria: TESORERIA_ESTADOS.REINCLUIDO,
    accionHistorial: DOCUMENTO_ACCIONES.TESORERIA_REINCLUIR,
    validateEstadoTesoreria: (estadoTesActual) => (
      estadoTesActual === TESORERIA_ESTADOS.EXCLUIDO
        ? null
        : validationError('Documento no esta excluido')
    )
  }),
  [TESORERIA_ACCIONES.REENVIAR]: Object.freeze({
    handlerType: 'reset',
    requiresDestino: true,
    estadoTesoreria: TESORERIA_ESTADOS.REENVIADO,
    accionHistorial: DOCUMENTO_ACCIONES.TESORERIA_REENVIAR,
    validateEstadoTesoreria: (estadoTesActual) => (
      estadoTesActual === TESORERIA_ESTADOS.EXCLUIDO
        ? validationError('Documento excluido, use reincluir')
        : null
    )
  })
});

const resolveTesoreriaActionPolicy = (accion) => TESORERIA_ACTION_POLICIES[accion] || null;

module.exports = {
  TESORERIA_ACTION_POLICIES,
  resolveTesoreriaActionPolicy
};
