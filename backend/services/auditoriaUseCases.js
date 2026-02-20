const { createError } = require('../utils/errors');
const { mapAuditoriaRow, mapEstadoDocumentoRow } = require('../mappers/auditoriaMapper');

const createAuditoriaUseCases = ({ auditoriaRepo }) => {
  if (!auditoriaRepo) {
    throw new Error('auditoriaRepo requerido');
  }

  const listAuditoria = async ({ facturaId }) => {
    const rows = await auditoriaRepo.listAuditoriaByFacturaId(facturaId);
    return rows.map(mapAuditoriaRow);
  };

  const crearAuditoria = async ({ facturaId, accion, usuario, detalles, ip_address }) => {
    if (!accion || !usuario) {
      throw createError(400, 'accion y usuario requeridos');
    }

    const detallesPayload = detalles ? JSON.stringify(detalles) : null;
    const ip = ip_address || '127.0.0.1';

    return auditoriaRepo.createAuditoria({
      facturaId,
      accion,
      usuario,
      detalles: detallesPayload,
      ip_address: ip
    });
  };

  const listEstados = async ({ facturaId }) => {
    const rows = await auditoriaRepo.listEstadosByFacturaId(facturaId);
    return rows.map(mapEstadoDocumentoRow);
  };

  const crearEstado = async ({ facturaId, estado_anterior, estado_nuevo, usuario, motivo }) => {
    if (!estado_nuevo || !usuario) {
      throw createError(400, 'estado_nuevo y usuario requeridos');
    }

    return auditoriaRepo.createEstado({
      facturaId,
      estado_anterior,
      estado_nuevo,
      usuario,
      motivo
    });
  };

  const actualizarEstadoFactura = async ({ facturaId, estado }) => {
    if (!estado) {
      throw createError(400, 'estado requerido');
    }

    const row = await auditoriaRepo.updateFacturaEstado({ facturaId, estado });
    if (!row) {
      throw createError(404, 'Factura no encontrada');
    }

    return mapEstadoDocumentoRow(row);
  };

  return {
    listAuditoria,
    crearAuditoria,
    listEstados,
    crearEstado,
    actualizarEstadoFactura
  };
};

module.exports = { createAuditoriaUseCases };
