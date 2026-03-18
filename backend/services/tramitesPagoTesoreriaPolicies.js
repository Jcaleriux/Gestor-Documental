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
    validateEstadoTesoreria: (estadoTesActual) => {
      if (estadoTesActual === TESORERIA_ESTADOS.PAGADO) {
        return validationError('Documento ya fue pagado');
      }
      if (estadoTesActual === TESORERIA_ESTADOS.EXCLUIDO) {
        return validationError('Documento ya esta excluido');
      }
      if (estadoTesActual === TESORERIA_ESTADOS.DEVUELTO_CONTABILIDAD) {
        return validationError('Documento ya fue devuelto a contabilidad');
      }
      return null;
    }
  }),
  [TESORERIA_ACCIONES.DEVOLVER_CONTABILIDAD]: Object.freeze({
    handlerType: 'returnToAccounting',
    requiresDestino: false,
    requiresMotivo: true,
    validateEstadoTesoreria: (estadoTesActual) => {
      if (estadoTesActual === TESORERIA_ESTADOS.PAGADO) {
        return validationError('Documento ya fue pagado');
      }
      if (estadoTesActual === TESORERIA_ESTADOS.EXCLUIDO) {
        return validationError('Documento excluido, reincluyelo si deseas volver a tramitarlo');
      }
      if (estadoTesActual === TESORERIA_ESTADOS.DEVUELTO_CONTABILIDAD) {
        return validationError('Documento ya fue devuelto a contabilidad');
      }
      return null;
    }
  }),
  [TESORERIA_ACCIONES.REINCLUIR]: Object.freeze({
    handlerType: 'reset',
    requiresDestino: true,
    estadoTesoreria: TESORERIA_ESTADOS.REINCLUIDO,
    accionHistorial: DOCUMENTO_ACCIONES.TESORERIA_REINCLUIR,
    validateEstadoTesoreria: (estadoTesActual) => (
      estadoTesActual === TESORERIA_ESTADOS.EXCLUIDO
        ? null
        : estadoTesActual === TESORERIA_ESTADOS.PAGADO
          ? validationError('Documento ya fue pagado')
          : validationError('Documento no esta excluido')
    )
  }),
  [TESORERIA_ACCIONES.REENVIAR]: Object.freeze({
    handlerType: 'reset',
    requiresDestino: true,
    estadoTesoreria: TESORERIA_ESTADOS.REENVIADO,
    accionHistorial: DOCUMENTO_ACCIONES.TESORERIA_REENVIAR,
    validateEstadoTesoreria: (estadoTesActual) => {
      if (estadoTesActual === TESORERIA_ESTADOS.PAGADO) {
        return validationError('Documento ya fue pagado');
      }
      if (estadoTesActual === TESORERIA_ESTADOS.EXCLUIDO) {
        return validationError('Documento excluido, use reincluir');
      }
      if (estadoTesActual === TESORERIA_ESTADOS.DEVUELTO_CONTABILIDAD) {
        return validationError('Documento fue devuelto a contabilidad; contabilicelo nuevamente y tramite uno nuevo');
      }
      return null;
    }
  })
});

const resolveTesoreriaActionPolicy = (accion) => TESORERIA_ACTION_POLICIES[accion] || null;

module.exports = {
  TESORERIA_ACTION_POLICIES,
  resolveTesoreriaActionPolicy
};
