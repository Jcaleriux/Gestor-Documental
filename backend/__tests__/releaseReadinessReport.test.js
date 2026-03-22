const path = require('path');

const {
  buildReleaseReadinessReport,
  buildSmokeChecklist,
  classifyBackupPlan,
  evaluateChangelog,
  evaluateProductionEnvEntries,
  resolveEnvFilePath,
} = require('../scripts/release_readiness_report');

describe('release readiness report', () => {
  test('evaluateProductionEnvEntries detecta placeholders y defaults riesgosos', () => {
    const result = evaluateProductionEnvEntries({
      envFilePath: path.join(__dirname, '..', '.env.production.example'),
      entries: {
        NODE_ENV: 'production',
        PORT: '3002',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USER: 'postgres',
        DB_PASSWORD: 'admin',
        DB_NAME: 'novogar_db',
        JWT_SECRET: 'dev-secret',
        FACTURAS_BASE_DIR: 'change-this-before-production',
      },
    });

    expect(result.issues).toEqual(expect.arrayContaining([
      'JWT_SECRET no puede usar dev-secret para produccion.',
      'DB_PASSWORD sigue usando la credencial dev por defecto.',
      'FACTURAS_BASE_DIR sigue con placeholder de ejemplo.',
    ]));
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('DB_HOST apunta a localhost'),
      expect.stringContaining('DB_USER usa postgres'),
      expect.stringContaining('DB_NAME usa novogar_db'),
    ]));
  });

  test('evaluateChangelog exige que la version objetivo aparezca en el changelog', () => {
    const assessment = evaluateChangelog({
      version: '1.0.0',
      content: '# Changelog\n\n## [Unreleased]\n',
    });

    expect(assessment.issues).toContain(
      'CHANGELOG.md no menciona la version objetivo 1.0.0.'
    );
  });

  test('classifyBackupPlan separa warnings de bloqueos', () => {
    const classification = classifyBackupPlan({
      issues: [
        'No se encontro git en PATH.',
        'No se encontro pg_dump en PATH.',
        'No existe la carpeta de facturas esperada: C:\\repo\\facturas',
      ],
    });

    expect(classification.blockingIssues).toEqual(expect.arrayContaining([
      'No se encontro pg_dump en PATH.',
      'No existe la carpeta de facturas esperada: C:\\repo\\facturas',
    ]));
    expect(classification.warnings).toContain('No se encontro git en PATH.');
  });

  test('buildReleaseReadinessReport deja ready=false si hay bloqueos', () => {
    const report = buildReleaseReadinessReport({
      version: '1.0.0',
      envFilePath: 'backend/.env.production.example',
      envEntries: { NODE_ENV: 'production' },
      envAssessment: {
        issues: ['JWT_SECRET sigue con placeholder de ejemplo.'],
        warnings: [],
      },
      changelogAssessment: { issues: [] },
      releaseChecksOk: true,
      backupPlan: {
        gitTag: 'v1.0.0',
        releaseDir: 'C:\\backups',
        metadataPath: 'C:\\backups\\release-plan.json',
      },
      backupAssessment: {
        blockingIssues: [],
        warnings: [],
      },
      migrationAssessment: {
        issues: [],
        status: {
          pendingMigrations: [],
          missingFiles: [],
          checksumMismatches: [],
        },
      },
      smokeChecklist: buildSmokeChecklist(),
    });

    expect(report.readyForProduction).toBe(false);
    expect(report.blockingIssues).toContain('JWT_SECRET sigue con placeholder de ejemplo.');
  });

  test('resolveEnvFilePath prioriza el primer candidato existente', () => {
    const candidateA = path.join(__dirname, 'missing.env');
    const candidateB = path.join(__dirname, '..', '.env.production.example');

    expect(resolveEnvFilePath({
      candidates: [candidateA, candidateB],
    })).toBe(candidateB);
  });
});
