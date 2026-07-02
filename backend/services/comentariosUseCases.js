const { createError } = require('../utils/errors');
const { ensureSociedadAccess } = require('./sociedadAccessService');

const createComentariosUseCases = ({ comentariosRepo }) => {
  if (!comentariosRepo) {
    throw new Error('comentariosRepo requerido');
  }

  const ensureFacturaSociedadAccess = async ({ facturaId, user }) => {
    if (typeof comentariosRepo.getFacturaById !== 'function') {
      throw new Error('comentariosRepo incompleto: falta getFacturaById');
    }

    const factura = await comentariosRepo.getFacturaById(facturaId);
    if (!factura) {
      throw createError(404, 'Factura no encontrada');
    }

    await ensureSociedadAccess({ user, sociedadId: factura.sociedad_id });
    return factura;
  };

  const listComentarios = async ({ facturaId, user }) => {
    await ensureFacturaSociedadAccess({ facturaId, user });
    return comentariosRepo.listByFacturaId(facturaId);
  };

  const crearComentario = async ({ facturaId, usuario, texto, user }) => {
    if (!usuario || !texto) {
      throw createError(400, 'usuario y texto requeridos');
    }

    await ensureFacturaSociedadAccess({ facturaId, user });

    return comentariosRepo.createComentario({ facturaId, usuario, texto });
  };

  return { listComentarios, crearComentario };
};

module.exports = { createComentariosUseCases };
