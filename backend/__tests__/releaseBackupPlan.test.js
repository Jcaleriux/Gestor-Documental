const path = require('path');

const {
  buildReleaseBackupPlan,
  detectExecutable,
  readGitMetadata,
  readTargetVersion,
  renderReleaseBackupPlan,
} = require('../scripts/release_backup_plan');

describe('release backup plan', () => {
  test('buildReleaseBackupPlan arma comandos y rutas esperadas', () => {
    const plan = buildReleaseBackupPlan({
      version: '1.0.0',
      dbConfig: {
        host: 'db.internal',
        port: 5432,
        user: 'SendaDocs',
        database: 'SendaDocs_prod',
      },
      runtimeConfigData: {
        storageBaseDir: 'C:\\operacion\\SendaDocs',
      },
      timestamp: '2026-03-21T12-00-00-000Z',
      backupRootDir: 'C:\\backups',
      branch: 'main',
      commit: 'abc123',
      executableStatus: {
        git: 'C:\\git.exe',
        pg_dump: 'C:\\pg_dump.exe',
        pg_restore: 'C:\\pg_restore.exe',
      },
      storagePathExists: () => true,
    });

    expect(plan.gitTag).toBe('v1.0.0');
    expect(plan.releaseDir).toBe(path.win32.join('C:\\backups', 'v1.0.0', '2026-03-21T12-00-00-000Z'));
    expect(plan.db.dumpPath).toContain('SendaDocs_prod_2026-03-21T12-00-00-000Z.dump');
    expect(plan.db.backupCommand).toContain('pg_dump');
    expect(plan.db.rollbackCommand).toContain('pg_restore');
    expect(plan.storage.documentosBackupCommand).toContain('Compress-Archive');
    expect(plan.readyForExecution).toBe(true);
  });

  test('buildReleaseBackupPlan marca issues cuando faltan tooling o carpetas', () => {
    const plan = buildReleaseBackupPlan({
      version: '1.0.0',
      dbConfig: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        database: 'sendadocs_db',
      },
      runtimeConfigData: {
        storageBaseDir: 'C:\\repo',
      },
      timestamp: '2026-03-21T12-00-00-000Z',
      backupRootDir: 'C:\\backups',
      executableStatus: {
        git: null,
        pg_dump: null,
        pg_restore: null,
      },
      storagePathExists: () => false,
    });

    expect(plan.readyForExecution).toBe(false);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.stringContaining('No existe la carpeta de documentos esperada'),
      expect.stringContaining('No existe la carpeta de facturas esperada'),
      'No se encontro git en PATH.',
      'No se encontro pg_dump en PATH.',
      'No se encontro pg_restore en PATH.',
    ]));
  });

  test('renderReleaseBackupPlan incluye secciones clave del runbook', () => {
    const output = renderReleaseBackupPlan(buildReleaseBackupPlan({
      version: '1.0.0',
      dbConfig: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        database: 'sendadocs_db',
      },
      runtimeConfigData: {
        storageBaseDir: 'C:\\repo',
      },
      timestamp: '2026-03-21T12-00-00-000Z',
      executableStatus: {
        git: 'git',
        pg_dump: 'pg_dump',
        pg_restore: 'pg_restore',
      },
      storagePathExists: () => true,
    }));

    expect(output).toContain('=== Release Backup Plan ===');
    expect(output).toContain('Backup de base de datos:');
    expect(output).toContain('Snapshot de filesystem operativo:');
    expect(output).toContain('Rollback de base de datos:');
    expect(output).toContain('Ready para ejecutar: si');
  });

  test('readTargetVersion lee la version objetivo desde VERSION', () => {
    expect(readTargetVersion({
      versionFilePath: path.join(__dirname, '..', '..', 'VERSION'),
    })).toBe('1.0.0');
  });

  test('readGitMetadata resuelve branch y commit del repo actual', () => {
    const metadata = readGitMetadata({
      rootDir: path.join(__dirname, '..', '..'),
    });

    expect(metadata.branch).toBeTruthy();
    expect(metadata.commit).toMatch(/^[0-9a-f]{40}$/i);
  });

  test('detectExecutable soporta PG_BIN_DIR sin depender de PATH global', () => {
    const resolved = detectExecutable('pg_dump', {
      platform: 'win32',
      env: {
        PG_BIN_DIR: 'C:\\Program Files\\PostgreSQL\\18\\bin',
      },
      fileExists: (targetPath) => targetPath === 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
      runner: () => {
        throw new Error('No deberia consultar PATH si PG_BIN_DIR ya resolvio el binario.');
      },
    });

    expect(resolved).toBe('C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe');
  });
});
