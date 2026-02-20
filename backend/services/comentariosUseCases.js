const { createError } = require('../utils/errors');

const createComentariosUseCases = ({ comentariosRepo }) => {
  if (!comentariosRepo) {
    throw new Error('comentariosRepo requerido');
  }

  const listComentarios = async ({ facturaId }) => {
    return comentariosRepo.listByFacturaId(facturaId);
  };

  const crearComentario = async ({ facturaId, usuario, texto }) => {
    if (!usuario || !texto) {
      throw createError(400, 'usuario y texto requeridos');
    }

    return comentariosRepo.createComentario({ facturaId, usuario, texto });
  };

  return { listComentarios, crearComentario };
};

module.exports = { createComentariosUseCases };
