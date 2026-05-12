const fs = require('fs');
const path = require('path');

const { parseEnvFile } = require('../config/env');
const { runReleaseChecks } = require('./release_checks');
const { runReleaseBackupPlan, readTargetVersion } = require('./release_backup_plan');

const backendRootDir = path.resolve(__dirname, '..');
const repoRootDir = path.resolve(backendRootDir, '..');
const changelogPath = path.join(repoRootDir, 'CHANGELOG.md');
const defaultEnvCandidates = [
  path.join(backendRootDir, '.env.production.local'),
  path.join(backendRootDir, '.env.production'),
  path.join(backendRootDir, '.env'),
  path.join(backendRootDir, '.env.production.example'),
];

const requiredProductionEnvKeys = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'CORS_ALLOWED_ORIGINS',
  'FACTURAS_BASE_DIR',
];

const resolveEnvFilePath = ({ explicitPath, candidates = defaultEnvCandidates } = {}) => {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  return candidates.find((candidatePath) => fs.existsSync(candidatePath)) || '';
};

const loadEnvEntries = ({ envFilePath }) => {
  if (!envFilePath) {
    return {
      envFilePath: '',
      entries: {},
      issues: ['No se encontro archivo de entorno para readiness productiva.'],
      warnings: [],
    };
  }

  if (!fs.existsSync(envFilePath)) {
    return {
      envFilePath,
      entries: {},
      issues: [`No existe el archivo de entorno indicado: ${envFilePath}`],
      warnings: [],
    };
  }

  return {
    envFilePath,
    entries: parseEnvFile(fs.readFileSync(envFilePath, 'utf8')),
    issues: [],
    warnings: [],
  };
};

const evaluateProductionEnvEntries = ({ entries = {}, envFilePath = '' } = {}) => {
  const issues = [];
  const warnings = [];

  requiredProductionEnvKeys.forEach((key) => {
    if (!entries[key] || !String(entries[key]).trim()) {
      issues.push(`Falta definir ${key} en el entorno productivo.`);
    }
  });

  if ((entries.NODE_ENV || '').trim() !== 'production') {
    issues.push('NODE_ENV debe ser production para un entorno productivo.');
  }

  if (!envFilePath) {
    warnings.push('No se uso un archivo de entorno especifico para el reporte.');
  } else if (envFilePath.endsWith('.env')) {
    warnings.push('El reporte esta usando backend/.env; para produccion conviene validar un archivo dedicado.');
  } else if (envFilePath.endsWith('.env.production.example')) {
    warnings.push('El reporte esta usando el ejemplo de produccion, no un entorno real.');
  }

  if ((entries.JWT_SECRET || '').trim() === 'dev-secret') {
    issues.push('JWT_SECRET no puede usar dev-secret para produccion.');
  }

  if ((entries.JWT_SECRET || '').trim() === 'change-this-before-production') {
    issues.push('JWT_SECRET sigue con placeholder de ejemplo.');
  }

  if ((entries.DB_PASSWORD || '').trim() === 'change-this-before-production') {
    issues.push('DB_PASSWORD sigue con placeholder de ejemplo.');
  }

  if ((entries.DB_PASSWORD || '').trim() === 'admin') {
    issues.push('DB_PASSWORD sigue usando la credencial dev por defecto.');
  }

  if ((entries.CORS_ALLOWED_ORIGINS || '').trim() === 'change-this-before-production') {
    issues.push('CORS_ALLOWED_ORIGINS sigue con placeholder de ejemplo.');
  }

  if ((entries.CORS_ALLOWED_ORIGINS || '').trim() === '*') {
    issues.push('CORS_ALLOWED_ORIGINS no puede usar wildcard en produccion.');
  }

  if ((entries.DB_HOST || '').trim() === 'localhost') {
    warnings.push('DB_HOST apunta a localhost; confirma que ese valor sea valido en el entorno destino.');
  }

  if ((entries.DB_USER || '').trim() === 'postgres') {
    warnings.push('DB_USER usa postgres; confirma que no sea una credencial dev por defecto.');
  }

  if ((entries.DB_NAME || '').trim() === 'novogar_db') {
    warnings.push('DB_NAME usa novogar_db; confirma que corresponde al entorno productivo.');
  }

  if ((entries.FACTURAS_BASE_DIR || '').trim() === 'change-this-before-production') {
    issues.push('FACTURAS_BASE_DIR sigue con placeholder de ejemplo.');
  }

  return {
    issues,
    warnings,
  };
};

const evaluateChangelog = ({ version, content }) => {
  const issues = [];

  if (!content) {
    issues.push('CHANGELOG.md no existe o esta vacio.');
    return { issues };
  }

  if (!content.includes(version)) {
    issues.push(`CHANGELOG.md no menciona la version objetivo ${version}.`);
  }

  return { issues };
};

const classifyBackupPlan = (plan) => {
  const blockingIssues = [];
  const warnings = [];

  plan.issues.forEach((issue) => {
    if (issue.includes('pg_dump') || issue.includes('pg_restore')) {
      blockingIssues.push(issue);
      return;
    }

    if (issue.includes('No existe la carpeta')) {
      blockingIssues.push(issue);
      return;
    }

    warnings.push(issue);
  });

  return {
    blockingIssues,
    warnings,
  };
};

const getMigrationStatusSafe = async ({ pool: sharedPool } = {}) => {
  let pool = sharedPool;
  const shouldClosePool = !sharedPool;

  try {
    pool = pool || require('../db');
    const { getMigrationStatus } = require('../db/migrationManager');
    const status = await getMigrationStatus(pool);

    return {
      issues: [
        ...(status.pendingMigrations.length > 0
          ? [`Hay ${status.pendingMigrations.length} migraciones pendientes.`]
          : []),
        ...(status.missingFiles.length > 0
          ? [`Hay ${status.missingFiles.length} migraciones registradas sin archivo.`]
          : []),
        ...(status.checksumMismatches.length > 0
          ? [`Hay ${status.checksumMismatches.length} migraciones con checksum distinto.`]
          : []),
      ],
      status,
    };
  } catch (error) {
    return {
      issues: [`No se pudo obtener el estado de migraciones: ${error.message}`],
      status: null,
    };
  } finally {
    if (shouldClosePool && pool) {
      await pool.end().catch(() => {});
    }
  }
};

const getLegacyPasswordAssessmentSafe = async ({ pool: sharedPool } = {}) => {
  let pool = sharedPool;
  const shouldClosePool = !sharedPool;

  try {
    pool = pool || require('../db');
    const { countLegacyPasswordUsers } = require('../repositories/usuariosRepository');
    const count = await countLegacyPasswordUsers(pool);

    return {
      issues: count > 0
        ? [`Hay ${count} usuarios con password legacy sin bcrypt.`]
        : [],
      count,
    };
  } catch (error) {
    return {
      issues: [`No se pudo auditar passwords legacy: ${error.message}`],
      count: null,
    };
  } finally {
    if (shouldClosePool && pool) {
      await pool.end().catch(() => {});
    }
  }
};

const buildSmokeChecklist = () => ([
  'GET /api/health responde 200',
  'Login con usuario valido',
  'Dashboard carga sin errores visibles',
  'Listado de facturas filtra correctamente',
  'Tramites de pago cargan correctamente',
  'Preview o descarga de documentos funciona si el entorno tiene storage operativo',
]);

const buildReleaseReadinessReport = ({
  version,
  envFilePath,
  envEntries,
  envAssessment,
  changelogAssessment,
  releaseChecksOk,
  backupPlan,
  backupAssessment,
  migrationAssessment,
  legacyPasswordAssessment = { issues: [], count: 0 },
  smokeChecklist,
} = {}) => {
  const blockingIssues = [
    ...envAssessment.issues,
    ...changelogAssessment.issues,
    ...(!releaseChecksOk ? ['Los release checks de backend no pasaron.'] : []),
    ...backupAssessment.blockingIssues,
    ...migrationAssessment.issues,
    ...legacyPasswordAssessment.issues,
  ];

  const warnings = [
    ...envAssessment.warnings,
    ...backupAssessment.warnings,
  ];

  return {
    version,
    readyForProduction: blockingIssues.length === 0,
    envFilePath,
    blockingIssues,
    warnings,
    releaseChecksOk,
    env: {
      assessedKeys: Object.keys(envEntries).sort(),
    },
    backupPlan: {
      gitTag: backupPlan.gitTag,
      releaseDir: backupPlan.releaseDir,
      metadataPath: backupPlan.metadataPath,
    },
    migrationStatus: migrationAssessment.status
      ? {
          pendingMigrations: migrationAssessment.status.pendingMigrations.length,
          missingFiles: migrationAssessment.status.missingFiles.length,
          checksumMismatches: migrationAssessment.status.checksumMismatches.length,
        }
      : null,
    legacyPasswordUsers: legacyPasswordAssessment.count,
    smokeChecklist,
  };
};

const renderReleaseReadinessReport = (report) => {
  const blockingLines = report.blockingIssues.length > 0
    ? report.blockingIssues.map((issue) => `- ${issue}`).join('\n')
    : '- Sin bloqueos detectados.';

  const warningLines = report.warnings.length > 0
    ? report.warnings.map((warning) => `- ${warning}`).join('\n')
    : '- Sin warnings adicionales.';

  const smokeLines = report.smokeChecklist.map((item) => `- ${item}`).join('\n');

  return [
    '=== Release Readiness Report ===',
    `Version objetivo: ${report.version}`,
    `Archivo de entorno evaluado: ${report.envFilePath || 'ninguno'}`,
    `Release checks backend: ${report.releaseChecksOk ? 'ok' : 'fallaron'}`,
    `Ready para produccion: ${report.readyForProduction ? 'si' : 'no'}`,
    '',
    'Bloqueos:',
    blockingLines,
    '',
    'Warnings:',
    warningLines,
    '',
    'Smoke checklist sugerido:',
    smokeLines,
    '',
    'Evidencia sugerida:',
    `- Guardar JSON del reporte en una ruta de release, por ejemplo: ${report.backupPlan.metadataPath.replace('release-plan.json', 'release-readiness.json')}`,
    '- Registrar commit, version, migraciones aplicadas y resultado de smoke checks.',
  ].join('\n');
};

const parseCliArgs = (argv) => {
  const args = [...argv];
  const options = {
    json: false,
    envFilePath: '',
  };

  while (args.length > 0) {
    const current = args.shift();

    if (current === '--json') {
      options.json = true;
      continue;
    }

    if (current === '--env-file') {
      const nextValue = args.shift();
      if (!nextValue) {
        throw new Error('Debes indicar una ruta despues de --env-file.');
      }
      options.envFilePath = nextValue;
      continue;
    }

    throw new Error(`Argumento no soportado: ${current}`);
  }

  return options;
};

const runReleaseReadinessReport = async ({
  logger = console,
  envFilePath,
} = {}) => {
  const version = readTargetVersion();
  const resolvedEnvFilePath = resolveEnvFilePath({ explicitPath: envFilePath });
  const envInfo = loadEnvEntries({ envFilePath: resolvedEnvFilePath });
  const envAssessment = evaluateProductionEnvEntries({
    entries: envInfo.entries,
    envFilePath: resolvedEnvFilePath,
  });
  const changelogContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : '';
  const changelogAssessment = evaluateChangelog({
    version,
    content: changelogContent,
  });

  let releaseChecksOk = true;
  try {
    await runReleaseChecks({ logger: { log: () => {} } });
  } catch (error) {
    releaseChecksOk = false;
  }

  const backupPlan = runReleaseBackupPlan({ logger: { log: () => {} } });
  const backupAssessment = classifyBackupPlan(backupPlan);
  let dbPool;
  try {
    dbPool = require('../db');
  } catch {
    dbPool = null;
  }
  const migrationAssessment = await getMigrationStatusSafe({ pool: dbPool });
  const legacyPasswordAssessment = await getLegacyPasswordAssessmentSafe({ pool: dbPool });
  if (dbPool) {
    await dbPool.end().catch(() => {});
  }

  const report = buildReleaseReadinessReport({
    version,
    envFilePath: resolvedEnvFilePath,
    envEntries: envInfo.entries,
    envAssessment,
    changelogAssessment,
    releaseChecksOk,
    backupPlan,
    backupAssessment,
    migrationAssessment,
    legacyPasswordAssessment,
    smokeChecklist: buildSmokeChecklist(),
  });

  logger.log(renderReleaseReadinessReport(report));

  return report;
};

module.exports = {
  buildReleaseReadinessReport,
  buildSmokeChecklist,
  classifyBackupPlan,
  defaultEnvCandidates,
  evaluateChangelog,
  evaluateProductionEnvEntries,
  getLegacyPasswordAssessmentSafe,
  loadEnvEntries,
  renderReleaseReadinessReport,
  resolveEnvFilePath,
  runReleaseReadinessReport,
};

if (require.main === module) {
  (async () => {
    try {
      const options = parseCliArgs(process.argv.slice(2));
      const report = await runReleaseReadinessReport({
        envFilePath: options.envFilePath,
        logger: options.json ? { log: () => {} } : console,
      });

      if (options.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      }
    } catch (error) {
      console.error('Release readiness report fallo:', error.message);
      process.exitCode = 1;
    }
  })();
}
