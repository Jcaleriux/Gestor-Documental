const express = require('express');
const { login } = require('../services/authService');
const { requireAuth } = require('../middleware/authMiddleware');
const { loadUserPermissions } = require('../middleware/permissionsMiddleware');
const { handleRequest } = require('../utils/http');

const router = express.Router();

router.post('/login', handleRequest(async (req) => {
  const result = await login(req.body || {});
  return {
    user: result.user,
    token: result.token
  };
}, 'Error en login:', 'Error en el servidor', { errorKey: 'message' }));

router.get('/me', requireAuth, loadUserPermissions, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = router;
