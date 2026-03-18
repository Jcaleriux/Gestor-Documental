const { assertFound } = require('../utils/errors');
const {
  parsePositiveIntOrThrow,
  parseOptionalPositiveIntOrThrow,
  toNormalizedLowerString
} = require('./tramitesPagoUseCases.helpers');
const {
  mapTramiteRow,
  mapDocumentoRow,
  mapRetencionRow,
  mapHistorialRow
} = require('../mappers/tramitesPagoMapper');

const createTramitesPagoReadUseCases = ({ tramitesPagoRepo }) => {
  const listTramites = async ({ sociedadId, estado }) => {
    const normalizedSociedadId = parseOptionalPositiveIntOrThrow(sociedadId, 'sociedadId');
    const normalizedEstado = estado ? toNormalizedLowerString(estado) : undefined;
    const rows = await tramitesPagoRepo.listTramites({
      sociedadId: normalizedSociedadId,
      estado: normalizedEstado
    });
    return rows.map(mapTramiteRow);
  };

  const getRetencionesDisponibles = async ({ sociedadId }) => {
    const sociedad = parsePositiveIntOrThrow(sociedadId, 'sociedadId');
    const rows = await tramitesPagoRepo.getRetencionesDisponibles({ sociedadId: sociedad });
    return rows.map(mapRetencionRow);
  };

  const getTramite = async ({ id, actorUserId }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const tramite = await tramitesPagoRepo.getTramiteById(tramiteId);
    assertFound(tramite, 'Tramite no encontrado');

    const [documentos, retenciones] = await Promise.all([
      tramitesPagoRepo.listDocumentosByTramite(tramiteId, null, { currentUserId: actorUserId }),
      tramitesPagoRepo.listRetencionesByTramite(tramiteId)
    ]);

    return {
      tramite: mapTramiteRow(tramite),
      documentos: documentos.map(mapDocumentoRow),
      retenciones: retenciones.map(mapRetencionRow)
    };
  };

  const getHistorial = async ({ id }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const rows = await tramitesPagoRepo.listHistorialByTramite(tramiteId);
    return rows.map(mapHistorialRow);
  };

  return {
    listTramites,
    getRetencionesDisponibles,
    getTramite,
    getHistorial
  };
};

module.exports = { createTramitesPagoReadUseCases };
