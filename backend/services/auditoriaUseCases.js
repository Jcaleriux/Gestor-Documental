const { createError } = require('../utils/errors');
const {
  mapAuditoriaRow,
  mapEstadoDocumentoRow,
  mapEstadoDocumentoTimelineRow,
  mapTramiteHistorialTimelineRow,
  mapGerenciaAprobacionTimelineRow,
  mapTramiteDocumentoLinkTimelineRow,
  mapPagoFacturaTimelineRow,
  mapRetencionPagoTimelineRow
} = require('../mappers/auditoriaMapper');

const toSortableTime = (value) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

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
    const [
      estadosRows,
      tramiteHistorialRows,
      gerenciaAprobacionesRows,
      tramiteDocumentoLinksRows,
      pagosFacturaRows,
      retencionPagosRows
    ] = await Promise.all([
      auditoriaRepo.listEstadosByFacturaId(facturaId),
      auditoriaRepo.listTramiteHistorialByFacturaId(facturaId),
      auditoriaRepo.listGerenciaAprobacionesByFacturaId(facturaId),
      auditoriaRepo.listTramiteDocumentoLinksByFacturaId(facturaId),
      auditoriaRepo.listPagosFacturaByFacturaId(facturaId),
      auditoriaRepo.listRetencionPagosByFacturaId(facturaId)
    ]);

    return [
      ...estadosRows.map(mapEstadoDocumentoTimelineRow),
      ...tramiteHistorialRows.map(mapTramiteHistorialTimelineRow),
      ...gerenciaAprobacionesRows.map(mapGerenciaAprobacionTimelineRow),
      ...tramiteDocumentoLinksRows.map(mapTramiteDocumentoLinkTimelineRow),
      ...pagosFacturaRows.map(mapPagoFacturaTimelineRow),
      ...retencionPagosRows.map(mapRetencionPagoTimelineRow)
    ]
      .filter(Boolean)
      .sort(
        (left, right) => toSortableTime(right?.sort_at || right?.creado_en)
          - toSortableTime(left?.sort_at || left?.creado_en)
      )
      .map(({ sort_at, ...event }) => event);
  };

  const crearEstado = async ({ facturaId, dominio, estado_anterior, estado_nuevo, usuario, motivo }) => {
    if (!estado_nuevo || !usuario) {
      throw createError(400, 'estado_nuevo y usuario requeridos');
    }

    return auditoriaRepo.createEstado({
      facturaId,
      dominio,
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
