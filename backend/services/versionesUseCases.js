const { createError } = require('../utils/errors');
const { mapVersionRow } = require('../mappers/versionesMapper');

const createVersionesUseCases = ({ versionesRepo }) => {
  if (!versionesRepo) {
    throw new Error('versionesRepo requerido');
  }

  const listVersiones = async ({ facturaId }) => {
    const rows = await versionesRepo.listVersionesByFacturaId(facturaId);
    return rows.map(mapVersionRow);
  };

  const crearVersion = async ({ facturaId, usuario, cambios, ruta_archivo }) => {
    if (!usuario || !cambios) {
      throw createError(400, 'usuario y cambios requeridos');
    }

    const maxNumero = await versionesRepo.getMaxNumeroByFacturaId(facturaId);
    const numero = maxNumero + 1;

    const row = await versionesRepo.createVersion({
      facturaId,
      numero,
      usuario,
      cambios,
      ruta_archivo
    });
    return mapVersionRow(row);
  };

  return {
    listVersiones,
    crearVersion
  };
};

module.exports = { createVersionesUseCases };
