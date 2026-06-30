const express = require('express');
const cors = require('cors');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const { notFoundMiddleware } = require('./middleware/notFoundMiddleware');
const { requireAuth } = require('./middleware/authMiddleware');
const {
  loadUserPermissions,
  requireAnyPermission
} = require('./middleware/permissionsMiddleware');
const { PERMISSIONS } = require('./domain/permissions');
const { applyReleaseHeaders, resolveReleaseInfo } = require('./config/releaseInfo');
const { runtimeConfig } = require('./config/runtime');
const { createFilesHandlers } = require('./services/filesService');

const app = express();
const releaseInfo = resolveReleaseInfo();
const legacyFilesHandlers = createFilesHandlers(runtimeConfig.storageBaseDir);
const corsExposedHeaders = [
  'Content-Disposition',
  'X-Novogar-Partial-Download',
  'X-Novogar-Omitted-Count',
  'X-Novogar-Omitted-Items'
];
const buildCorsOptions = ({ allowedOrigins, exposedHeaders }) => {
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
    return { exposedHeaders };
  }

  const allowedOriginsSet = new Set(allowedOrigins);

  return {
    exposedHeaders,
    origin(origin, callback) {
      if (!origin || allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
  };
};
const filesAccessPermission = requireAnyPermission([
  PERMISSIONS.DOCUMENTOS_VER,
  PERMISSIONS.DOCUMENTOS_DESCARGAR
]);

app.disable('x-powered-by');
app.set('query parser', 'simple');

// Middleware
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(cors(buildCorsOptions({
  allowedOrigins: runtimeConfig.corsAllowedOrigins,
  exposedHeaders: corsExposedHeaders,
})));
app.use(express.json({ limit: runtimeConfig.jsonBodyLimit }));
app.use((req, res, next) => {
  applyReleaseHeaders(res, releaseInfo);
  next();
});

// Legacy /files URLs are served through the same resource authorization as /api/files.
app.get(
  '/files/*',
  requireAuth,
  loadUserPermissions,
  filesAccessPermission,
  legacyFilesHandlers.getStatic
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

app.get('/api/release-info', (req, res) => {
  res.json({
    success: true,
    data: {
      version: releaseInfo.version,
      tag: releaseInfo.tag,
      commit: releaseInfo.commit,
      commit_short: releaseInfo.commitShort,
      branch: releaseInfo.branch,
      sources: releaseInfo.sources,
    },
  });
});

// Comentarios, Versiones, Auditoria routes
const comentariosRoutes = require('./routes/comentarios');
const versionesRoutes = require('./routes/versiones');
const auditoriaRoutes = require('./routes/auditoria');
const tramitesPagoRoutes = require('./routes/tramitesPago');
const contabilizacionRoutes = require('./routes/contabilizacion');
const contabilizacionMasivaRoutes = require('./routes/contabilizacionMasiva');
const dashboardRoutes = require('./routes/dashboard');
const facturasRoutes = require('./routes/facturas');
const pdfsPendientesRoutes = require('./routes/pdfsPendientes');
const filesRoutes = require('./routes/files');
const usuariosRoutes = require('./routes/usuarios');
const sociedadesRoutes = require('./routes/sociedades');
const proveedoresRoutes = require('./routes/proveedores');
const centrosCostoRoutes = require('./routes/centrosCosto');
const tablasPagoRoutes = require('./routes/tablasPago');
const ordenesCompraRoutes = require('./routes/ordenesCompra');
const reservasRoutes = require('./routes/reservas');

[
  comentariosRoutes,
  versionesRoutes,
  auditoriaRoutes,
  tramitesPagoRoutes,
  contabilizacionRoutes,
  contabilizacionMasivaRoutes,
  dashboardRoutes,
  facturasRoutes,
  pdfsPendientesRoutes,
  filesRoutes,
  usuariosRoutes,
  sociedadesRoutes,
  proveedoresRoutes,
  centrosCostoRoutes,
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


