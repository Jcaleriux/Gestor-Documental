const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');
const { createError } = require('../utils/errors');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, bearerToken] = header.split(' ');
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  const token = (type === 'Bearer' && bearerToken) ? bearerToken : queryToken;

  if (!token) {
    return next(createError(401, 'Token requerido'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.sub,
      nombre: decoded.nombre,
      email: decoded.email,
      rol: decoded.rol
    };
    return next();
  } catch (error) {
    return next(createError(401, 'Token invalido'));
  }
};

module.exports = { requireAuth };
