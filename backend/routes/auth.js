const express = require('express');
const { login } = require('../services/authService');
const { requireAuth } = require('../middleware/authMiddleware');
const { loadUserPermissions } = require('../middleware/permissionsMiddleware');
const { handleRequest } = require('../utils/http');
const usuariosRepo = require('../repositories/usuariosRepository');

const router = express.Router();

router.post('/login', handleRequest(async (req) => {
  const result = await login(req.body || {});
  return {
    user: result.user,
    token: result.token
  };
}, 'Error en login:', 'Error en el servidor', { errorKey: 'message' }));

router.get('/me', requireAuth, loadUserPermissions, handleRequest(async (req) => {
  const currentUser = await usuariosRepo.getUsuarioById(req.user.id);
  return {
    user: {
      ...req.user,
      rol: currentUser?.rol_id || req.user.rol,
      rol_codigo: currentUser?.rol_codigo || '',
      rol_nombre: currentUser?.rol_nombre || ''
    }
  };
}, 'Error fetching current user:', 'Error fetching current user'));

module.exports = router;
