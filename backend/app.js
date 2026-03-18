const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const { notFoundMiddleware } = require('./middleware/notFoundMiddleware');
const { requireAuth } = require('./middleware/authMiddleware');
const {
  loadUserPermissions,
  requireAnyPermission
} = require('./middleware/permissionsMiddleware');
const { PERMISSIONS } = require('./domain/permissions');
const { resolveDocumentPaths } = require('./utils/documentPaths');

const app = express();
const storageBaseDir = process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, '..');
const documentPaths = resolveDocumentPaths(storageBaseDir);
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '20mb';
const filesAccessPermission = requireAnyPermission([
  PERMISSIONS.DOCUMENTOS_VER,
  PERMISSIONS.DOCUMENTOS_DESCARGAR
]);

// Middleware
app.use(cors());
app.use(express.json({ limit: jsonBodyLimit }));

// Serve static files from documentos directory.
app.use(
  '/files',
  requireAuth,
  loadUserPermissions,
  filesAccessPermission,
  express.static(documentPaths.documentsRootDir)
);

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Public API routes
app.get('/api', (req, res) => {
  res.json({ success: true, message: 'API root. Use /api/health or other endpoints.' });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Comentarios, Versiones, Auditoria routes
const comentariosRoutes = require('./routes/comentarios');
const versionesRoutes = require('./routes/versiones');
const auditoriaRoutes = require('./routes/auditoria');
const tramitesPagoRoutes = require('./routes/tramitesPago');
const contabilizacionRoutes = require('./routes/contabilizacion');
const dashboardRoutes = require('./routes/dashboard');
const facturasRoutes = require('./routes/facturas');
const filesRoutes = require('./routes/files');
const usuariosRoutes = require('./routes/usuarios');
const sociedadesRoutes = require('./routes/sociedades');
const proveedoresRoutes = require('./routes/proveedores');
const tablasPagoRoutes = require('./routes/tablasPago');
const ordenesCompraRoutes = require('./routes/ordenesCompra');
const reservasRoutes = require('./routes/reservas');

[
  comentariosRoutes,
  versionesRoutes,
  auditoriaRoutes,
  tramitesPagoRoutes,
  contabilizacionRoutes,
  dashboardRoutes,
  facturasRoutes,
  filesRoutes,
  usuariosRoutes,
  sociedadesRoutes,
  proveedoresRoutes,
  tablasPagoRoutes,
  ordenesCompraRoutes,
  reservasRoutes
].forEach((router) => app.use('/api', requireAuth, loadUserPermissions, router));

// Root route: API only
app.get('/', (req, res) => {
  res.json({ message: 'Backend API. Frontend is served separately.' });
});

// 404 handler
app.use(notFoundMiddleware);

// Error handling middleware
app.use(errorMiddleware('Internal server error'));

module.exports = app;


