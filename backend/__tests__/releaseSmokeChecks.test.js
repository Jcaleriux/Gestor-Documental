const {
  DEFAULT_SMOKE_CONFIG,
  createCheckResult,
  parseCliArgs,
  renderSmokeChecksReport,
  resolveSmokeConfig,
  runReleaseSmokeChecks,
} = require('../scripts/release_smoke_checks');

const createSmokeAgent = ({ requiresSetup }) => ({
  get(path) {
    if (path === '/api/health') {
      return Promise.resolve({
        status: 200,
        body: { success: true },
        headers: {
          'x-sendadocs-release-version': '1.0.0',
          'x-sendadocs-release-commit-short': 'abc1234',
        },
      });
    }

    if (path === '/api/release-info') {
      return Promise.resolve({
        status: 200,
        body: {
          success: true,
          data: {
            version: '1.0.0',
            tag: '',
            commit_short: 'abc1234',
          },
        },
        headers: {},
      });
    }

    if (path === '/api/onboarding/status') {
      return Promise.resolve({
        status: 200,
        body: {
          success: true,
          data: {
            requiresSetup,
            setupAllowed: requiresSetup,
          },
        },
        headers: {},
      });
    }

    throw new Error(`Ruta inesperada: ${path}`);
  },
  post(path) {
    throw new Error(`POST inesperado: ${path}`);
  },
});

describe('release smoke checks script', () => {
  test('resolveSmokeConfig no usa credenciales demo y acepta overrides por entorno', () => {
    expect(resolveSmokeConfig({})).toEqual(DEFAULT_SMOKE_CONFIG);

    expect(resolveSmokeConfig({
      SMOKE_USER_EMAIL: 'ops@sendadocs.local',
      SMOKE_USER_PASSWORD: 'secreta',
      SMOKE_SOCIEDAD_ID: '18',
      SMOKE_FACTURAS_PAGE_SIZE: '7',
    })).toEqual({
      email: 'ops@sendadocs.local',
      password: 'secreta',
      sociedadId: '18',
      facturasPageSize: 7,
    });
  });

  test('parseCliArgs reconoce json y output', () => {
    expect(parseCliArgs(['--json', '--output', 'tmp/report.json'])).toEqual({
      json: true,
      outputPath: 'tmp/report.json',
    });
  });

  test('renderSmokeChecksReport resume checks principales', () => {
    const report = {
      ok: true,
      generatedAt: '2026-03-22T08:00:00.000Z',
      config: {
        email: '',
        sociedadId: '18',
      },
      checks: [
        createCheckResult({ name: 'api_health', ok: true, status: 200 }),
        createCheckResult({ name: 'dashboard_stats', ok: true, status: 200 }),
        createCheckResult({ name: 'dashboard_work_queue', ok: true, status: 200 }),
      ],
    };

    const output = renderSmokeChecksReport(report);

    expect(output).toContain('=== Release Smoke Checks ===');
    expect(output).toContain('Resultado general: ok');
    expect(output).toContain('Usuario smoke: no configurado');
    expect(output).toContain('- api_health: ok (HTTP 200)');
    expect(output).toContain('- dashboard_stats: ok (HTTP 200)');
    expect(output).toContain('- dashboard_work_queue: ok (HTTP 200)');
  });

  test('runReleaseSmokeChecks acepta base limpia pendiente de onboarding sin credenciales', async () => {
    const report = await runReleaseSmokeChecks({
      env: {},
      agent: createSmokeAgent({ requiresSetup: true }),
    });

    expect(report.ok).toBe(true);
    expect(report.config.email).toBe('');
    expect(report.checks.map((check) => check.name)).toEqual([
      'api_health',
      'api_release_info',
      'onboarding_status',
      'smoke_credentials_configured',
    ]);
    expect(report.checks.at(-1)).toMatchObject({
      name: 'smoke_credentials_configured',
      ok: true,
    });
  });

  test('runReleaseSmokeChecks exige credenciales cuando onboarding ya no esta pendiente', async () => {
    const report = await runReleaseSmokeChecks({
      env: {},
      agent: createSmokeAgent({ requiresSetup: false }),
    });

    expect(report.ok).toBe(false);
    expect(report.checks.at(-1)).toMatchObject({
      name: 'smoke_credentials_configured',
      ok: false,
    });
    expect(report.checks.at(-1).details.reason).toContain('SMOKE_USER_EMAIL');
  });
});
