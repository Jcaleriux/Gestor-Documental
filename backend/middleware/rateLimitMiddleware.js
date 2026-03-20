const createRateLimitMiddleware = ({
  windowMs,
  maxRequests,
  keyGenerator = (req) => req.ip || 'unknown',
  now = () => Date.now(),
  message = 'Demasiados intentos. Intente de nuevo mas tarde.',
  errorKey = 'error',
}) => {
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error('windowMs debe ser un entero positivo');
  }

  if (!Number.isInteger(maxRequests) || maxRequests < 0) {
    throw new Error('maxRequests debe ser un entero mayor o igual a 0');
  }

  if (maxRequests === 0) {
    return (req, res, next) => next();
  }

  const buckets = new Map();

  return (req, res, next) => {
    const currentTime = now();
    const key = String(keyGenerator(req) || 'unknown');
    const currentBucket = buckets.get(key);

    if (!currentBucket || currentBucket.resetAt <= currentTime) {
      buckets.set(key, {
        count: 1,
        resetAt: currentTime + windowMs,
      });
      return next();
    }

    currentBucket.count += 1;

    if (currentBucket.count > maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((currentBucket.resetAt - currentTime) / 1000)
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        [errorKey]: message,
        data: { retryAfterSeconds },
      });
    }

    return next();
  };
};

module.exports = {
  createRateLimitMiddleware,
};
