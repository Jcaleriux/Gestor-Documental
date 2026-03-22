const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { resolveDbConfig } = require('../config/env');
const { readGitMetadata, readTargetVersion } = require('../config/releaseInfo');
const { runtimeConfig } = require('../config/runtime');

const backendRootDir = path.resolve(__dirname, '..');
const repoRootDir = path.resolve(backendRootDir, '..');
const defaultBackupRootDir = path.join(backendRootDir, 'backups');

const toReleaseTimestamp = (date = new Date()) => date.toISOString().replace(/[:.]/g, '-');

const quotePowerShell = (value) => `"${String(value).replace(/"/g, '""')}"`;

const readCommandOutput = (command, args, runner = execFileSync) => {
  try {
    return String(runner(command, args, {
      cwd: repoRootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })).trim();
  } catch (error) {
    return '';
  }
};


const detectExecutable = (name, {
  runner = execFileSync,
  platform = process.platform,
  env = process.env,
  fileExists = (targetPath) => fs.existsSync(targetPath),
} = {}) => {
  if ((name === 'pg_dump' || name === 'pg_restore') && env.PG_BIN_DIR) {
    const binaryName = platform === 'win32' ? `${name}.exe` : name;
    const candidatePath = path.join(env.PG_BIN_DIR, binaryName);

    if (fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  const locator = platform === 'win32' ? 'where.exe' : 'which';
  const result = readCommandOutput(locator, [name], runner);

  if (!result) {
    return null;
  }

  return result.split(/\r?\n/)[0].trim();
};

const buildReleaseBackupPlan = ({
  version,
  dbConfig,
  runtimeConfigData,
  timestamp,
  backupRootDir = defaultBackupRootDir,
  branch = '',
  commit = '',
  executableStatus = {},
  storagePathExists = (targetPath) => fs.existsSync(targetPath),
} = {}) => {
  const effectiveTimestamp = timestamp || toReleaseTimestamp();
  const effectiveBackupRootDir = path.resolve(backupRootDir);
  const releaseDir = path.join(effectiveBackupRootDir, `v${version}`, effectiveTimestamp);
  const dbDumpPath = path.join(releaseDir, 'db', `${dbConfig.database}_${effectiveTimestamp}.dump`);
  const storageDir = path.join(releaseDir, 'storage');
  const documentosSourceDir = path.join(runtimeConfigData.storageBaseDir, 'documentos');
  const facturasSourceDir = path.join(runtimeConfigData.storageBaseDir, 'facturas');
  const documentosArchivePath = path.join(storageDir, `documentos_${effectiveTimestamp}.zip`);
  const facturasArchivePath = path.join(storageDir, `facturas_${effectiveTimestamp}.zip`);
  const metadataPath = path.join(releaseDir, 'release-plan.json');

  const issues = [];

  if (!storagePathExists(documentosSourceDir)) {
    issues.push(`No existe la carpeta de documentos esperada: ${documentosSourceDir}`);
  }

  if (!storagePathExists(facturasSourceDir)) {
    issues.push(`No existe la carpeta de facturas esperada: ${facturasSourceDir}`);
  }

  ['git', 'pg_dump', 'pg_restore'].forEach((binary) => {
    if (!executableStatus[binary]) {
      issues.push(`No se encontro ${binary} en PATH.`);
    }
  });

  const dbBackupCommand = [
    'pg_dump',
    '--format=custom',
    '--verbose',
    `--host=${dbConfig.host}`,
    `--port=${dbConfig.port}`,
    `--username=${dbConfig.user}`,
    `--file=${quotePowerShell(dbDumpPath)}`,
    dbConfig.database,
  ].join(' ');

  const dbInspectCommand = [
    'pg_restore',
    '--list',
    quotePowerShell(dbDumpPath),
  ].join(' ');

  const dbRollbackCommand = [
    'pg_restore',
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    `--host=${dbConfig.host}`,
    `--port=${dbConfig.port}`,
    `--username=${dbConfig.user}`,
    `--dbname=${dbConfig.database}`,
    quotePowerShell(dbDumpPath),
  ].join(' ');

  const documentosBackupCommand = [
    'Compress-Archive',
    '-LiteralPath',
    quotePowerShell(documentosSourceDir),
    '-DestinationPath',
    quotePowerShell(documentosArchivePath),
    '-Force',
  ].join(' ');

  const facturasBackupCommand = [
    'Compress-Archive',
    '-LiteralPath',
    quotePowerShell(facturasSourceDir),
    '-DestinationPath',
    quotePowerShell(facturasArchivePath),
    '-Force',
  ].join(' ');

  return {
    version,
    gitTag: `v${version}`,
    branch,
    commit,
    timestamp: effectiveTimestamp,
    backupRootDir: effectiveBackupRootDir,
    releaseDir,
    metadataPath,
    readyForExecution: issues.length === 0,
    issues,
    executableStatus,
    db: {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      dumpPath: dbDumpPath,
      backupCommand: dbBackupCommand,
      inspectCommand: dbInspectCommand,
      rollbackCommand: dbRollbackCommand,
    },
    storage: {
      baseDir: runtimeConfigData.storageBaseDir,
      documentosSourceDir,
      facturasSourceDir,
      documentosArchivePath,
      facturasArchivePath,
      documentosBackupCommand,
      facturasBackupCommand,
    },
  };
};

const renderReleaseBackupPlan = (plan) => {
  const issueLines = plan.issues.length > 0
    ? plan.issues.map((issue) => `- ${issue}`).join('\n')
    : '- Sin issues detectados por el helper.';

  const toolLines = Object.entries(plan.executableStatus)
    .map(([name, resolvedPath]) => `- ${name}: ${resolvedPath || 'MISSING'}`)
    .join('\n');

  return [
    '=== Release Backup Plan ===',
    `Version objetivo: ${plan.version}`,
    `Tag objetivo: ${plan.gitTag}`,
    `Branch actual: ${plan.branch || 'desconocido'}`,
    `Commit actual: ${plan.commit || 'desconocido'}`,
    `Timestamp: ${plan.timestamp}`,
    `Directorio sugerido de release backup: ${plan.releaseDir}`,
    '',
    'Tooling detectado:',
    toolLines,
    '',
    'Issues detectados:',
    issueLines,
    '',
    'Backup de base de datos:',
    `- Dump destino: ${plan.db.dumpPath}`,
    `- Comando pg_dump: ${plan.db.backupCommand}`,
    `- Verificacion pg_restore --list: ${plan.db.inspectCommand}`,
    '',
    'Snapshot de filesystem operativo:',
    `- Documentos origen: ${plan.storage.documentosSourceDir}`,
    `- Facturas origen: ${plan.storage.facturasSourceDir}`,
    `- Backup documentos: ${plan.storage.documentosBackupCommand}`,
    `- Backup facturas: ${plan.storage.facturasBackupCommand}`,
    '',
    'Rollback de base de datos:',
    `- Comando sugerido: ${plan.db.rollbackCommand}`,
    '',
    'Metadata del release:',
    `- Guardar plan JSON en: ${plan.metadataPath}`,
    `- Ejemplo: node backend/scripts/release_backup_plan.js --json > ${quotePowerShell(plan.metadataPath)}`,
    '',
    `Ready para ejecutar: ${plan.readyForExecution ? 'si' : 'no'}`,
  ].join('\n');
};

const runReleaseBackupPlan = ({
  logger = console,
  versionFilePath,
  backupRootDir = defaultBackupRootDir,
  date = new Date(),
  runner = execFileSync,
  platform = process.platform,
  storagePathExists,
} = {}) => {
  const version = readTargetVersion({ versionFilePath });
  const dbConfig = resolveDbConfig();
  const executableStatus = {
    git: detectExecutable('git', { runner, platform }),
    pg_dump: detectExecutable('pg_dump', { runner, platform }),
    pg_restore: detectExecutable('pg_restore', { runner, platform }),
  };
  const gitMetadata = readGitMetadata();
  const plan = buildReleaseBackupPlan({
    version,
    dbConfig,
    runtimeConfigData: runtimeConfig,
    timestamp: toReleaseTimestamp(date),
    backupRootDir,
    branch: gitMetadata.branch,
    commit: gitMetadata.commit,
    executableStatus,
    storagePathExists,
  });

  logger.log(renderReleaseBackupPlan(plan));

  return plan;
};

const parseCliArgs = (argv) => {
  const args = [...argv];
  const options = {
    json: false,
    backupRootDir: defaultBackupRootDir,
  };

  while (args.length > 0) {
    const current = args.shift();

    if (current === '--json') {
      options.json = true;
      continue;
    }

    if (current === '--backup-root') {
      const nextValue = args.shift();

      if (!nextValue) {
        throw new Error('Debes indicar una ruta despues de --backup-root.');
      }

      options.backupRootDir = nextValue;
      continue;
    }

    throw new Error(`Argumento no soportado: ${current}`);
  }

  return options;
};

module.exports = {
  buildReleaseBackupPlan,
  defaultBackupRootDir,
  detectExecutable,
  readTargetVersion,
  readGitMetadata,
  renderReleaseBackupPlan,
  runReleaseBackupPlan,
  toReleaseTimestamp,
};

if (require.main === module) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const plan = runReleaseBackupPlan({
      backupRootDir: options.backupRootDir,
      logger: options.json ? { log: () => {} } : console,
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    }
  } catch (error) {
    console.error('Release backup plan fallo:', error.message);
    process.exitCode = 1;
  }
}
