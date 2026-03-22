const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { loadMigrations } = require('../db/migrationManager');

const backendRoot = path.join(__dirname, '..');

const filesToCheck = [
  'app.js',
  'server.js',
  'config/env.js',
  'config/runtime.js',
  'db/create_tables.js',
  'db/reset_schema.js',
  'db/check_structure.js',
  'db/migrationManager.js',
  'db/migrate.js',
  'db/migrate_status.js',
];

const checkJsSyntax = (relativeFile, { backendRootDir = backendRoot } = {}) => {
  const absolutePath = path.join(backendRootDir, relativeFile);
  const source = fs.readFileSync(absolutePath, 'utf8');
  new vm.Script(source, { filename: absolutePath });
};

const checkBootstrapSchema = ({
  initSqlPath = path.join(backendRoot, 'db', 'database', '00_init.sql'),
} = {}) => {
  const initSql = fs.readFileSync(initSqlPath, 'utf8');

  if (!initSql.includes('CREATE TABLE IF NOT EXISTS public.schema_migrations')) {
    throw new Error('00_init.sql debe incluir schema_migrations en el bootstrap runtime.');
  }

  if (!initSql.includes('baseline_00_init_runtime_schema')) {
    throw new Error('00_init.sql debe registrar el baseline runtime.');
  }
};

const runReleaseChecks = async ({
  logger = console,
  backendRootDir = backendRoot,
  migrationsDir,
} = {}) => {
  logger.log('Chequeando sintaxis de archivos backend criticos...');
  filesToCheck.forEach((relativeFile) => {
    checkJsSyntax(relativeFile, { backendRootDir });
  });

  logger.log('Chequeando bootstrap runtime de base de datos...');
  checkBootstrapSchema({
    initSqlPath: path.join(backendRootDir, 'db', 'database', '00_init.sql'),
  });

  logger.log('Chequeando manifest de migraciones versionadas...');
  const migrations = loadMigrations(
    migrationsDir ? { migrationsDir } : undefined
  );
  logger.log(`Migraciones versionadas detectadas: ${migrations.length}`);

  logger.log('Release checks backend: OK');

  return {
    migrationCount: migrations.length,
  };
};

module.exports = {
  filesToCheck,
  checkJsSyntax,
  checkBootstrapSchema,
  runReleaseChecks,
};

if (require.main === module) {
  runReleaseChecks().catch((error) => {
    console.error('Release checks backend fallaron:', error.message);
    process.exitCode = 1;
  });
}
