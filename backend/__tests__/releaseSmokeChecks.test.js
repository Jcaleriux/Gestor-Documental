const {
  DEFAULT_SMOKE_CONFIG,
  createCheckResult,
  parseCliArgs,
  renderSmokeChecksReport,
  resolveSmokeConfig,
} = require('../scripts/release_smoke_checks');

describe('release smoke checks script', () => {
  test('resolveSmokeConfig usa defaults y acepta overrides por entorno', () => {
    expect(resolveSmokeConfig({})).toEqual(DEFAULT_SMOKE_CONFIG);

    expect(resolveSmokeConfig({
      SMOKE_USER_EMAIL: 'ops@novogar.local',
      SMOKE_USER_PASSWORD: 'secreta',
      SMOKE_SOCIEDAD_ID: '18',
      SMOKE_FACTURAS_PAGE_SIZE: '7',
    })).toEqual({
      email: 'ops@novogar.local',
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
        email: 'admin@novogar.local',
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
    expect(output).toContain('- api_health: ok (HTTP 200)');
    expect(output).toContain('- dashboard_stats: ok (HTTP 200)');
    expect(output).toContain('- dashboard_work_queue: ok (HTTP 200)');
  });
});
