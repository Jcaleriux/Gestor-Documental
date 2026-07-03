import { chromium, request } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.join(repoRoot, 'backend');
const frontendDir = path.join(repoRoot, 'frontend');
const outputDir = path.join(repoRoot, 'docs', 'presentaciones', 'capturas-app');
const metadataPath = path.join(outputDir, 'capturas-metadata.json');

const FRONTEND_URL = 'http://127.0.0.1:5173';
const BACKEND_URL = 'http://127.0.0.1:3002';
const AUTH_TOKEN_KEY = 'sendadocs.auth.token';
const AUTH_USER_KEY = 'sendadocs.auth.user';
const SELECTED_SOCIEDAD_KEY = 'sendadocs.sociedad.selected';
const credentials = {
  email: process.env.SENDADOCS_PORTFOLIO_EMAIL || 'admin@sendadocs.local',
  password: process.env.SENDADOCS_PORTFOLIO_PASSWORD || 'SendaDocs2026!',
};

const capturePlan = [
  {
    slug: '01-dashboard',
    route: '/',
    waitForText: /Dashboard/i,
    description: 'Dashboard general con KPIs operativos, moneda y actividad reciente.',
  },
  {
    slug: '02-facturas',
    route: '/facturas',
    waitForText: /Facturas/i,
    description: 'Listado de facturas con filtros, resumen y vista operativa.',
  },
  {
    slug: '03-tramites',
    route: '/tramites',
    waitForText: /Tramites/i,
    description: 'Workflow de tramites de pago con seguimiento por estado.',
  },
  {
    slug: '04-reservas',
    route: '/reservas',
    waitForText: /Reservas/i,
    description: 'Modulo de reservas con trazabilidad documental y acciones operativas.',
    beforeShot: async (page) => {
      const detailButton = page.getByRole('button', { name: /Ver detalle/i }).first();
      if (await detailButton.isVisible().catch(() => false)) {
        await detailButton.click();
        await page.waitForTimeout(1500);
      }
    },
  },
  {
    slug: '05-ordenes-compra',
    route: '/ordenes-compra',
    waitForText: /Ordenes de compra/i,
    description: 'Carga y consulta de ordenes de compra por proveedor.',
  },
  {
    slug: '06-usuarios',
    route: '/usuarios',
    waitForText: /Administracion de usuarios/i,
    description: 'Administracion de usuarios, roles y acceso por sociedades.',
  },
];

const spawnedProcesses = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const spawnProcess = (command, args, cwd, name, options = {}) => {
  const child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: Boolean(options.shell),
    windowsHide: true,
  });

  const stdout = [];
  const stderr = [];

  child.stdout.on('data', (chunk) => {
    stdout.push(String(chunk));
  });

  child.stderr.on('data', (chunk) => {
    stderr.push(String(chunk));
  });

  const processRef = { child, name, stdout, stderr };
  spawnedProcesses.push(processRef);
  return processRef;
};

const stopProcess = async ({ child }) => {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  child.kill('SIGTERM');
};

const stopAllProcesses = async () => {
  await Promise.allSettled(
    [...spawnedProcesses].reverse().map(stopProcess),
  );
};

const getProcessLogs = () => {
  return spawnedProcesses.map(({ name, stdout, stderr }) => ({
    name,
    stdout: stdout.join('').trim(),
    stderr: stderr.join('').trim(),
  }));
};

const waitForHttp = async (url, { acceptStatus = [200], timeoutMs = 45000 } = {}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (acceptStatus.includes(response.status)) {
        return response.status;
      }
    } catch {
      // Keep polling until timeout.
    }

    await sleep(1000);
  }

  throw new Error(`Timeout waiting for ${url}`);
};

const startLocalStack = async () => {
  spawnProcess('node', ['server.js'], backendDir, 'backend');
  await waitForHttp(`${BACKEND_URL}/api/auth/me`, { acceptStatus: [401] });

  spawnProcess('npm.cmd', ['run', 'dev'], frontendDir, 'frontend', { shell: true });
  await waitForHttp(FRONTEND_URL, { acceptStatus: [200] });
};

const createSession = async () => {
  const api = await request.newContext({ baseURL: BACKEND_URL });
  try {
    const loginResponse = await api.post('/api/auth/login', {
      data: credentials,
    });
    const loginBody = await loginResponse.json().catch(() => ({}));
    if (!loginResponse.ok() || !loginBody?.data?.token) {
      throw new Error(`Login fallido: ${loginResponse.status()} ${JSON.stringify(loginBody)}`);
    }

    const token = loginBody.data.token;
    const user = loginBody.data.user || null;

    const sociedadesApi = await request.newContext({
      baseURL: BACKEND_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    try {
      const sociedadesResponse = await sociedadesApi.get('/api/sociedades');
      const sociedadesBody = await sociedadesResponse.json().catch(() => ({}));
      const sociedades = Array.isArray(sociedadesBody?.data) ? sociedadesBody.data : [];
      if (!sociedadesResponse.ok() || sociedades.length === 0) {
        throw new Error(`No se encontraron sociedades: ${sociedadesResponse.status()} ${JSON.stringify(sociedadesBody)}`);
      }

      return {
        token,
        user,
        sociedadId: String(sociedades[0].id),
        sociedadNombre: sociedades[0].nombre_proyecto || sociedades[0].razon_social || '',
      };
    } finally {
      await sociedadesApi.dispose();
    }
  } finally {
    await api.dispose();
  }
};

const preparePage = async (session) => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    colorScheme: 'light',
  });

  await context.addInitScript(
    ({ token, user, sociedadId, authTokenKey, authUserKey, selectedSociedadKey }) => {
      window.localStorage.setItem(authTokenKey, token);
      if (user) {
        window.localStorage.setItem(authUserKey, JSON.stringify(user));
      }
      window.localStorage.setItem(selectedSociedadKey, sociedadId);
    },
    {
      ...session,
      authTokenKey: AUTH_TOKEN_KEY,
      authUserKey: AUTH_USER_KEY,
      selectedSociedadKey: SELECTED_SOCIEDAD_KEY,
    },
  );

  const page = await context.newPage();
  return { browser, context, page };
};

const captureScreens = async (page, session) => {
  const captures = [];

  for (const item of capturePlan) {
    const targetUrl = new URL(item.route, FRONTEND_URL).toString();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.getByText(item.waitForText).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);

    if (item.beforeShot) {
      await item.beforeShot(page);
      await page.waitForTimeout(800);
    }

    const filename = `${item.slug}.png`;
    const filePath = path.join(outputDir, filename);
    await page.screenshot({ path: filePath, fullPage: false });

    captures.push({
      ...item,
      fileName: filename,
      filePath,
      sociedadNombre: session.sociedadNombre,
    });
  }

  return captures;
};

const main = async () => {
  await mkdir(outputDir, { recursive: true });

  try {
    await startLocalStack();
    const session = await createSession();
    const { browser, context, page } = await preparePage(session);

    try {
      const captures = await captureScreens(page, session);
      const metadata = {
        generatedAt: new Date().toISOString(),
        frontendUrl: FRONTEND_URL,
        backendUrl: BACKEND_URL,
        sociedadId: session.sociedadId,
        sociedadNombre: session.sociedadNombre,
        captures: captures.map(({ fileName, route, slug, description }) => ({
          fileName,
          route,
          slug,
          description,
        })),
      };

      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      console.log(JSON.stringify(metadata, null, 2));
    } finally {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  } catch (error) {
    const diagnostic = {
      message: error.message,
      logs: getProcessLogs(),
    };
    console.error(JSON.stringify(diagnostic, null, 2));
    process.exitCode = 1;
  } finally {
    await stopAllProcesses();
  }
};

await main();
process.exit(process.exitCode || 0);
