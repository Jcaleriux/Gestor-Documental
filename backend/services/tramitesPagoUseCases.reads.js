const { createError, assertFound } = require('../utils/errors');
const {
  mapTramiteRow,
  mapDocumentoRow,
  mapRetencionRow,
  mapHistorialRow
} = require('../mappers/tramitesPagoMapper');

const createTramitesPagoReadUseCases = ({ tramitesPagoRepo }) => {
  const listTramites = async ({ sociedadId, estado }) => {
    const rows = await tramitesPagoRepo.listTramites({ sociedadId, estado });
    return rows.map(mapTramiteRow);
  };

  const getRetencionesDisponibles = async ({ sociedadId }) => {
    const sociedad = Number(sociedadId);
    if (!Number.isInteger(sociedad) || sociedad <= 0) {
      throw createError(400, 'sociedadId invalido');
    }
    const rows = await tramitesPagoRepo.getRetencionesDisponibles({ sociedadId: sociedad });
    return rows.map(mapRetencionRow);
  };

  const getTramite = async ({ id }) => {
    const tramite = await tramitesPagoRepo.getTramiteById(id);
    assertFound(tramite, 'Tramite no encontrado');

    const [documentos, retenciones] = await Promise.all([
      tramitesPagoRepo.listDocumentosByTramite(id),
      tramitesPagoRepo.listRetencionesByTramite(id)
    ]);

    return {
      tramite: mapTramiteRow(tramite),
      documentos: documentos.map(mapDocumentoRow),
      retenciones: retenciones.map(mapRetencionRow)
    };
  };

  const getHistorial = async ({ id }) => {
    const rows = await tramitesPagoRepo.listHistorialByTramite(id);
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
