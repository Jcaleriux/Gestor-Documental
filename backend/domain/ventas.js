const VENTA_OPERACION_ESTADOS = Object.freeze({
  ACTIVA: 'activa',
  CANCELADA: 'cancelada',
  TRASLADADA: 'trasladada',
  CERRADA: 'cerrada'
});

const VENTA_HISTORIAL_ACCIONES = Object.freeze({
  CREADA: 'creada',
  CANCELADA: 'cancelada',
  CERRADA: 'cerrada',
  TRASLADO_SALIDA: 'traslado_salida',
  TRASLADO_ENTRADA: 'traslado_entrada',
  DOCUMENTO_REGISTRADO: 'documento_registrado',
  DOCUMENTO_REEMPLAZADO: 'documento_reemplazado'
});

module.exports = {
  VENTA_OPERACION_ESTADOS,
  VENTA_HISTORIAL_ACCIONES
};
