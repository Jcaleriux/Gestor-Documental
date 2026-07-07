const fs = require('fs');
const path = require('path');

const backendRootDir = path.resolve(__dirname, '..');
const repoRootDir = path.resolve(backendRootDir, '..');
const defaultEnvFilePath = path.join(backendRootDir, '.env.production.local');
const defaultRuntimeBaseDir = path.join(repoRootDir, 'runtime', 'preprod');

const toPosixPath = (value) => value.replace(/\\/g, '/');

const buildLocalPreproductionEnvTemplate = ({
  port = 3302,
  dbHost = 'localhost',
  dbPort = 5432,
  dbUser = 'sendadocs_preprod_app',
  dbPassword = 'change-this-before-production',
  dbName = 'sendadocs_preprod',
  jwtSecret = 'change-this-before-production',
  corsAllowedOrigins = 'http://127.0.0.1:4173,http://localhost:4173',
  runtimeBaseDir = defaultRuntimeBaseDir,
  pgBinDir = 'C:/Program Files/PostgreSQL/18/bin',
} = {}) => {
  const relativeRuntimeBaseDir = toPosixPath(path.relative(backendRootDir, runtimeBaseDir) || '.');

  return [
    '# Entorno local casi-productivo para SendaDocs',
    '# No versionar este archivo con secretos reales.',
    'NODE_ENV=production',
    `PORT=${port}`,
    '',
    '# Base de datos separada del entorno dev',
    `DB_HOST=${dbHost}`,
    `DB_PORT=${dbPort}`,
    `DB_USER=${dbUser}`,
    `DB_PASSWORD=${dbPassword}`,
    `DB_NAME=${dbName}`,
    `PG_BIN_DIR=${pgBinDir}`,
    '',
    '# Auth',
    `JWT_SECRET=${jwtSecret}`,
    'JWT_EXPIRES_IN=8h',
    'BCRYPT_ROUNDS=12',
    `CORS_ALLOWED_ORIGINS=${corsAllowedOrigins}`,
    '',
    '# Storage y limites',
    `FACTURAS_BASE_DIR=${relativeRuntimeBaseDir}`,
    'JSON_BODY_LIMIT=20mb',
    'PERMISSIONS_CACHE_TTL_MS=60000',
    'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS=600000',
    'AUTH_LOGIN_RATE_LIMIT_MAX=20',
    'TABLAS_PAGO_MAX_FILE_MB=10',
    'ORDENES_COMPRA_MAX_FILE_MB=10',
    'RESERVAS_DOC_MAX_FILE_MB=15',
    'WATCHER_SCAN_DEBOUNCE_MS=600',
    'WATCHER_LATE_FILES_DELAY_MS=2000',
    'WATCHER_AWF_STABILITY_MS=2000',
    'WATCHER_AWF_POLL_MS=100',
    '',
    '# Release smoke checks',
    'SMOKE_USER_EMAIL=',
    'SMOKE_USER_PASSWORD=',
    'SMOKE_SOCIEDAD_ID=',
    'SMOKE_FACTURAS_PAGE_SIZE=5',
    '',
  ].join('\n');
};

const ensureDirectory = (targetDir) => {
  if (fs.existsSync(targetDir)) {
    return false;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  return true;
};

const setupLocalPreproduction = ({
  envFilePath = defaultEnvFilePath,
  runtimeBaseDir = defaultRuntimeBaseDir,
} = {}) => {
  const ensuredDirs = [
    runtimeBaseDir,
    path.join(runtimeBaseDir, 'documentos'),
    path.join(runtimeBaseDir, 'facturas'),
  ].map((targetDir) => ({
    targetDir,
    created: ensureDirectory(targetDir),
  }));

  let envFileCreated = false;
  if (!fs.existsSync(envFilePath)) {
    fs.writeFileSync(
      envFilePath,
      buildLocalPreproductionEnvTemplate({ runtimeBaseDir }),
      'utf8'
    );
    envFileCreated = true;
  }

  return {
    envFilePath,
    runtimeBaseDir,
    ensuredDirs,
    envFileCreated,
  };
};

const renderSetupSummary = (result) => {
  const dirsSummary = result.ensuredDirs
    .map(({ targetDir, created }) => `- ${targetDir} (${created ? 'creada' : 'ya existia'})`)
    .join('\n');

  return [
    '=== Local Preproduction Setup ===',
    `Archivo de entorno: ${result.envFilePath} (${result.envFileCreated ? 'creado' : 'ya existia'})`,
    `Runtime base dir: ${result.runtimeBaseDir}`,
    '',
    'Directorios:',
    dirsSummary,
    '',
    'Siguientes pasos sugeridos:',
    '- Editar backend/.env.production.local y reemplazar placeholders de DB_PASSWORD y JWT_SECRET.',
    '- Crear o confirmar una base separada, por ejemplo sendadocs_preprod.',
    '- Ejecutar: pnpm --dir backend run preprod:db:migrate',
    '- Ejecutar: pnpm --dir backend run preprod:readiness',
    '- Si el entorno ya tiene usuarios, configurar SMOKE_USER_EMAIL y SMOKE_USER_PASSWORD antes de preprod:smoke.',
    '- Levantar backend con: pnpm --dir backend run preprod:start',
    '- Para frontend local tipo release: pnpm --dir frontend run build && pnpm --dir frontend run preview -- --host 127.0.0.1 --port 4173',
  ].join('\n');
};

module.exports = {
  buildLocalPreproductionEnvTemplate,
  defaultEnvFilePath,
  defaultRuntimeBaseDir,
  renderSetupSummary,
  setupLocalPreproduction,
};

if (require.main === module) {
  const result = setupLocalPreproduction();
  console.log(renderSetupSummary(result));
}
