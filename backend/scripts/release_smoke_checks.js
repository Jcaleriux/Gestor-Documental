const fs = require('fs');
const path = require('path');

const request = require('supertest');

const app = require('../app');

const DEFAULT_SMOKE_CONFIG = Object.freeze({
  email: 'admin@sendadocs.local',
  password: 'SendaDocs2026!',
  sociedadId: '',
  facturasPageSize: 5,
});

const readOptionalEnvValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed || '';
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveSmokeConfig = (env = process.env) => ({
  email: readOptionalEnvValue(env.SMOKE_USER_EMAIL) || DEFAULT_SMOKE_CONFIG.email,
  password: readOptionalEnvValue(env.SMOKE_USER_PASSWORD) || DEFAULT_SMOKE_CONFIG.password,
  sociedadId: readOptionalEnvValue(env.SMOKE_SOCIEDAD_ID),
  facturasPageSize: toPositiveInt(
    readOptionalEnvValue(env.SMOKE_FACTURAS_PAGE_SIZE),
    DEFAULT_SMOKE_CONFIG.facturasPageSize
  ),
});

const createCheckResult = ({ name, ok, status = null, details = {} }) => ({
  name,
  ok: Boolean(ok),
  status,
  details,
});

const writeJsonFile = (targetPath, value) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(value, null, 2));
};

const parseCliArgs = (argv) => {
  const args = [...argv];
  const options = {
    json: false,
    outputPath: '',
  };

  while (args.length > 0) {
    const current = args.shift();

    if (current === '--json') {
      options.json = true;
      continue;
    }

    if (current === '--output') {
      const nextValue = args.shift();

      if (!nextValue) {
        throw new Error('Debes indicar una ruta despues de --output.');
      }

      options.outputPath = nextValue;
      continue;
    }

    throw new Error(`Argumento no soportado: ${current}`);
  }

  return options;
};

const runReleaseSmokeChecks = async ({
  env = process.env,
} = {}) => {
  const smokeConfig = resolveSmokeConfig(env);
  const checks = [];

  const health = await request(app).get('/api/health');
  checks.push(createCheckResult({
    name: 'api_health',
    ok: health.status === 200 && health.body?.success === true,
    status: health.status,
    details: {
      success: health.body?.success === true,
      releaseVersionHeader: health.headers['x-sendadocs-release-version'] || '',
      releaseCommitHeader: health.headers['x-sendadocs-release-commit-short'] || '',
    },
  }));

  const releaseInfo = await request(app).get('/api/release-info');
  checks.push(createCheckResult({
    name: 'api_release_info',
    ok: releaseInfo.status === 200 && releaseInfo.body?.success === true && Boolean(releaseInfo.body?.data?.version),
    status: releaseInfo.status,
    details: {
      version: releaseInfo.body?.data?.version || '',
      tag: releaseInfo.body?.data?.tag || '',
      commitShort: releaseInfo.body?.data?.commit_short || '',
    },
  }));

  const login = await request(app)
    .post('/api/auth/login')
    .send({
      email: smokeConfig.email,
      password: smokeConfig.password,
    });
  const token = login.body?.data?.token || '';

  checks.push(createCheckResult({
    name: 'auth_login',
    ok: login.status === 200 && login.body?.success === true && Boolean(token),
    status: login.status,
    details: {
      email: smokeConfig.email,
      tokenIssued: Boolean(token),
      userEmail: login.body?.data?.user?.email || '',
    },
  }));

  if (!token) {
    return {
      ok: false,
      generatedAt: new Date().toISOString(),
      config: smokeConfig,
      checks,
    };
  }

  const withAuth = (req) => req.set('Authorization', `Bearer ${token}`);

  const me = await withAuth(request(app).get('/api/auth/me'));
  checks.push(createCheckResult({
    name: 'auth_me',
    ok: me.status === 200 && me.body?.success === true && Boolean(me.body?.data?.user),
    status: me.status,
    details: {
      email: me.body?.data?.user?.email || '',
      role: me.body?.data?.user?.role || '',
    },
  }));

  const sociedades = await withAuth(request(app).get('/api/sociedades'));
  const sociedadesList = Array.isArray(sociedades.body?.data) ? sociedades.body.data : [];
  const resolvedSociedadId = smokeConfig.sociedadId || String(sociedadesList[0]?.id || '');

  checks.push(createCheckResult({
    name: 'sociedades_list',
    ok: sociedades.status === 200 && sociedades.body?.success === true && sociedadesList.length > 0,
    status: sociedades.status,
    details: {
      total: sociedadesList.length,
      sociedadIdUsada: resolvedSociedadId,
    },
  }));

  const dashboardStats = await withAuth(
    request(app).get('/api/dashboard/stats').query(
      resolvedSociedadId ? { sociedadId: resolvedSociedadId } : {}
    )
  );
  checks.push(createCheckResult({
    name: 'dashboard_stats',
    ok: dashboardStats.status === 200 && dashboardStats.body?.success === true
      && typeof dashboardStats.body?.data?.totalFacturas === 'number',
    status: dashboardStats.status,
    details: {
      sociedadId: resolvedSociedadId,
      totalFacturas: dashboardStats.body?.data?.totalFacturas,
      totalSociedades: dashboardStats.body?.data?.totalSociedades,
    },
  }));

  const dashboardWorkQueue = await withAuth(
    request(app).get('/api/dashboard/work-queue').query(
      resolvedSociedadId ? { sociedadId: resolvedSociedadId } : {}
    )
  );
  checks.push(createCheckResult({
    name: 'dashboard_work_queue',
    ok: dashboardWorkQueue.status === 200
      && dashboardWorkQueue.body?.success === true
      && dashboardWorkQueue.body?.data
      && typeof dashboardWorkQueue.body.data.facturas === 'object'
      && typeof dashboardWorkQueue.body.data.tramites === 'object',
    status: dashboardWorkQueue.status,
    details: {
      sociedadId: resolvedSociedadId,
      facturasKeys: Object.keys(dashboardWorkQueue.body?.data?.facturas || {}),
      tramitesKeys: Object.keys(dashboardWorkQueue.body?.data?.tramites || {}),
    },
  }));

  const dashboardRecent = await withAuth(
    request(app).get('/api/dashboard/recent-documents').query(
      resolvedSociedadId ? { sociedadId: resolvedSociedadId } : {}
    )
  );
  checks.push(createCheckResult({
    name: 'dashboard_recent_documents',
    ok: dashboardRecent.status === 200 && dashboardRecent.body?.success === true
      && Array.isArray(dashboardRecent.body?.data),
    status: dashboardRecent.status,
    details: {
      sociedadId: resolvedSociedadId,
      items: Array.isArray(dashboardRecent.body?.data) ? dashboardRecent.body.data.length : null,
    },
  }));

  const facturas = await withAuth(
    request(app).get('/api/facturas').query({
      ...(resolvedSociedadId ? { sociedadId: resolvedSociedadId } : {}),
      page: 1,
      pageSize: smokeConfig.facturasPageSize,
    })
  );
  const facturasItems = Array.isArray(facturas.body?.data?.items) ? facturas.body.data.items : [];
  checks.push(createCheckResult({
    name: 'facturas_list',
    ok: facturas.status === 200 && facturas.body?.success === true
      && Array.isArray(facturasItems)
      && typeof facturas.body?.data?.meta?.totalItems === 'number',
    status: facturas.status,
    details: {
      sociedadId: resolvedSociedadId,
      totalItems: facturas.body?.data?.meta?.totalItems,
      sampleIds: facturasItems.slice(0, 3).map((item) => item.id),
    },
  }));

  const tramites = await withAuth(
    request(app).get('/api/tramites-pago').query(
      resolvedSociedadId ? { sociedadId: resolvedSociedadId } : {}
    )
  );
  const tramitesList = Array.isArray(tramites.body?.data) ? tramites.body.data : [];
  checks.push(createCheckResult({
    name: 'tramites_pago_list',
    ok: tramites.status === 200 && tramites.body?.success === true && Array.isArray(tramitesList),
    status: tramites.status,
    details: {
      sociedadId: resolvedSociedadId,
      total: tramitesList.length,
    },
  }));

  return {
    ok: checks.every((check) => check.ok),
    generatedAt: new Date().toISOString(),
    config: {
      ...smokeConfig,
      password: smokeConfig.password ? '<hidden>' : '',
      sociedadId: resolvedSociedadId,
    },
    checks,
  };
};

const renderSmokeChecksReport = (report) => {
  const lines = [
    '=== Release Smoke Checks ===',
    `Resultado general: ${report.ok ? 'ok' : 'fallo'}`,
    `Generado en: ${report.generatedAt}`,
    `Usuario smoke: ${report.config.email}`,
    `Sociedad usada: ${report.config.sociedadId || 'auto'}`,
    '',
    'Checks:',
  ];

  report.checks.forEach((check) => {
    lines.push(`- ${check.name}: ${check.ok ? 'ok' : 'fallo'}${check.status ? ` (HTTP ${check.status})` : ''}`);
  });

  return lines.join('\n');
};

module.exports = {
  DEFAULT_SMOKE_CONFIG,
  createCheckResult,
  parseCliArgs,
  renderSmokeChecksReport,
  resolveSmokeConfig,
  runReleaseSmokeChecks,
};

if (require.main === module) {
  (async () => {
    try {
      const options = parseCliArgs(process.argv.slice(2));
      const report = await runReleaseSmokeChecks();

      if (options.outputPath) {
        writeJsonFile(path.resolve(options.outputPath), report);
      }

      if (options.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        console.log(renderSmokeChecksReport(report));
      }

      if (!report.ok) {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error('Release smoke checks fallaron:', error.message);
      process.exitCode = 1;
    }
  })();
}
