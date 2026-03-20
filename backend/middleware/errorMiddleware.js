const { toErrorResponse, shouldLogError } = require('../utils/http');
const { runtimeConfig } = require('../config/runtime');

const errorMiddleware = (fallbackMessage = 'Internal server error') => (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error && (error.type === 'entity.too.large' || error.status === 413 || error.statusCode === 413)) {
    return res.status(413).json({
      success: false,
      error: `Archivo demasiado grande. Tamano maximo permitido: ${runtimeConfig.maxTablaPagoMb} MB.`
    });
  }

  if (shouldLogError(error)) {
    console.error('Unhandled error:', error);
  }

  const { status, payload } = toErrorResponse(error, fallbackMessage);
  return res.status(status).json(payload);
};

module.exports = { errorMiddleware };
