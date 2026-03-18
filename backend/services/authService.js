const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS } = require('../config/auth');
const usuariosRepo = require('../repositories/usuariosRepository');
const { createError } = require('../utils/errors');
const { permissionsService } = require('./permissionsService');

const isBcryptHash = (value) => typeof value === 'string' && value.startsWith('$2');

const buildUserPayload = (user) => ({
  id: user.id,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol_id,
  rol_codigo: user.rol_codigo || '',
  rol_nombre: user.rol_nombre || ''
});

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw createError(400, 'email y password requeridos');
  }

  const user = await usuariosRepo.getByEmail(email);
  if (!user) {
    throw createError(401, 'Credenciales incorrectas');
  }

  if (user.activo === false) {
    throw createError(401, 'Usuario inactivo');
  }

  const storedPassword = user.password || '';
  let isValid = false;

  if (isBcryptHash(storedPassword)) {
    isValid = await bcrypt.compare(password, storedPassword);
  } else {
    isValid = storedPassword === password;
    if (isValid) {
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await usuariosRepo.updatePassword(user.id, hash);
    }
  }

  if (!isValid) {
    throw createError(401, 'Credenciales incorrectas');
  }

  const payload = buildUserPayload(user);
  const permissions = await permissionsService.listPermissionsByRole(user.rol_id);
  const token = jwt.sign(
    { sub: user.id, email: user.email, nombre: user.nombre, rol: user.rol_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    user: {
      ...payload,
      permissions
    },
    token
  };
};

module.exports = {
  login,
  buildUserPayload
};
