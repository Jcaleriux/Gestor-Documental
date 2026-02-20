const { toErrorResponse, shouldLogError } = require('../utils/http');

const parseMaxTablaPagoMb = () => {
  const raw = Number(process.env.TABLAS_PAGO_MAX_FILE_MB);
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
};

const MAX_TABLA_PAGO_MB = parseMaxTablaPagoMb();

const errorMiddleware = (fallbackMessage = 'Internal server error') => (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error && (error.type === 'entity.too.large' || error.status === 413 || error.statusCode === 413)) {
    return res.status(413).json({
      success: false,
      error: `Archivo demasiado grande. Tamano maximo permitido: ${MAX_TABLA_PAGO_MB} MB.`
    });
  }

  if (shouldLogError(error)) {
    console.error('Unhandled error:', error);
  }

  const { status, payload } = toErrorResponse(error, fallbackMessage);
  return res.status(status).json(payload);
};

module.exports = { errorMiddleware };
