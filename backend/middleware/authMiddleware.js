const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');
const { createError } = require('../utils/errors');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, bearerToken] = header.split(' ');
  const token = (type === 'Bearer' && bearerToken) ? bearerToken : '';

  if (!token) {
    return next(createError(401, 'Token requerido'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const tokenPermissions = Array.isArray(decoded.permissions)
      ? decoded.permissions.filter(Boolean).map((permission) => String(permission).trim())
      : undefined;
    req.user = {
      id: decoded.sub,
      nombre: decoded.nombre,
      email: decoded.email,
      rol: decoded.rol,
      ...(tokenPermissions ? { permissions: tokenPermissions } : {})
    };
    return next();
  } catch (error) {
    return next(createError(401, 'Token invalido'));
  }
};

module.exports = { requireAuth };
