const { createError } = require('../utils/errors');

const notFoundMiddleware = (req, res, next) => {
  next(createError(404, 'Ruta no encontrada'));
};

module.exports = { notFoundMiddleware };
