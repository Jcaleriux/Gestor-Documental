const RESERVA_OPERACION_ESTADOS = Object.freeze({
  ACTIVA: 'activa',
  CANCELADA: 'cancelada',
  TRASLADADA: 'trasladada',
  CERRADA: 'cerrada'
});

const RESERVA_HISTORIAL_ACCIONES = Object.freeze({
  CREADA: 'creada',
  CANCELADA: 'cancelada',
  CERRADA: 'cerrada',
  TRASLADO_SALIDA: 'traslado_salida',
  TRASLADO_ENTRADA: 'traslado_entrada',
  DOCUMENTO_REGISTRADO: 'documento_registrado',
  DOCUMENTO_REEMPLAZADO: 'documento_reemplazado'
});

module.exports = {
  RESERVA_OPERACION_ESTADOS,
  RESERVA_HISTORIAL_ACCIONES
};


