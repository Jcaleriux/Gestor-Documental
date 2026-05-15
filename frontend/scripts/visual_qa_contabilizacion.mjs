import { chromium, request } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const AUTH_TOKEN_KEY = 'novogar_auth_token';
const AUTH_USER_KEY = 'novogar_auth_user';
const SELECTED_SOCIEDAD_KEY = 'novogar.sociedad.selected';

const baseUrl = process.env.NOVOGAR_QA_BASE_URL || 'http://127.0.0.1:5173';
const facturaId = process.env.NOVOGAR_QA_FACTURA_ID || '4390';
const email = process.env.NOVOGAR_QA_EMAIL;
const password = process.env.NOVOGAR_QA_PASSWORD;
const selectedSociedadId = process.env.NOVOGAR_QA_SOCIEDAD_ID || '';
const outputDir = process.env.NOVOGAR_QA_OUTPUT_DIR
  || path.join(os.tmpdir(), 'novogar-visual-qa');

const targetPath = `/facturas/${facturaId}/contabilizacion`;
const targetUrl = new URL(targetPath, baseUrl).toString();

const viewports = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'laptop-1366x768', width: 1366, height: 768 },
];

const assertEnv = () => {
  if (!email || !password) {
    throw new Error(
      'Set NOVOGAR_QA_EMAIL and NOVOGAR_QA_PASSWORD before running this script.',
    );
  }
};

const login = async () => {
  const api = await request.newContext({ baseURL: baseUrl });
  try {
    const response = await api.post('/api/auth/login', {
      data: { email, password },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok() || !body?.success || !body?.data?.token) {
      throw new Error(
        `Login failed with ${response.status()}: ${JSON.stringify(body)}`,
      );
    }

    return {
      token: body.data.token,
      user: body.data.user || null,
    };
  } finally {
    await api.dispose();
  }
};

const resolveSociedadId = async (session) => {
  if (selectedSociedadId) {
    return selectedSociedadId;
  }

  const api = await request.newContext({
    baseURL: baseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  try {
    const response = await api.get(`/api/facturas/${facturaId}`);
    const body = await response.json().catch(() => ({}));
    const factura = body?.data || body?.factura || body;
    const sociedadId = factura?.sociedad_id || factura?.sociedadId || '';

    if (!response.ok() || !sociedadId) {
      throw new Error(
        `Could not resolve sociedad for factura ${facturaId}: ${response.status()} ${JSON.stringify(body)}`,
      );
    }

    return String(sociedadId);
  } finally {
    await api.dispose();
  }
};

const openAuthenticatedPage = async ({ browser, session, viewport }) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleMessages = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });

  await context.addInitScript(
    ({ token, user, sociedadId }) => {
      window.localStorage.setItem('novogar_auth_token', token);
      if (user) {
        window.localStorage.setItem('novogar_auth_user', JSON.stringify(user));
      }
      if (sociedadId) {
        window.localStorage.setItem('novogar.sociedad.selected', sociedadId);
      }
    },
    {
      token: session.token,
      user: session.user,
      sociedadId: session.sociedadId,
    },
  );

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  if (new URL(page.url()).pathname === '/login') {
    throw new Error(`Still redirected to /login at ${viewport.name}`);
  }

  try {
    await page.getByText(/Documento de referencia/i).waitFor({ timeout: 15000 });
    await page.getByText(/Datos de contabilizaci/i).waitFor({ timeout: 15000 });
  } catch (error) {
    const failureScreenshotPath = path.join(outputDir, `${viewport.name}-failure.png`);
    await page.screenshot({ path: failureScreenshotPath, fullPage: false });
    const bodyText = await page.locator('body').innerText().catch(() => '');
    throw new Error(
      [
        `Target content was not visible at ${viewport.name}.`,
        `Current URL: ${page.url()}`,
        `Failure screenshot: ${failureScreenshotPath}`,
        `Body text: ${bodyText.slice(0, 1000)}`,
        `Original error: ${error.message}`,
      ].join('\n'),
    );
  }

  const pageScreenshotPath = path.join(outputDir, `${viewport.name}-page.png`);
  await page.screenshot({ path: pageScreenshotPath, fullPage: false });

  let modalScreenshotPath = '';
  const openModalButton = page.getByRole('button', { name: /Ver todos/i }).first();
  if (await openModalButton.isVisible().catch(() => false)) {
    await openModalButton.click();
    await page.getByRole('dialog', { name: /Seleccionar centro de costo/i }).waitFor({ timeout: 10000 });
    modalScreenshotPath = path.join(outputDir, `${viewport.name}-modal.png`);
    await page.screenshot({ path: modalScreenshotPath, fullPage: false });
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  }

  await context.close();

  return {
    consoleMessages,
    modalScreenshotPath,
    pageScreenshotPath,
    url: page.url(),
    viewport: viewport.name,
  };
};

assertEnv();
await mkdir(outputDir, { recursive: true });

const session = await login();
session.sociedadId = await resolveSociedadId(session);
const browser = await chromium.launch();
const results = [];

try {
  for (const viewport of viewports) {
    results.push(await openAuthenticatedPage({ browser, session, viewport }));
  }
} finally {
  await browser.close();
}

const relevantConsoleMessages = results.flatMap((result) => result.consoleMessages);
const summary = {
  targetUrl,
  screenshots: results.flatMap((result) => (
    [result.pageScreenshotPath, result.modalScreenshotPath].filter(Boolean)
  )),
  consoleMessages: relevantConsoleMessages,
};

console.log(JSON.stringify(summary, null, 2));

if (relevantConsoleMessages.some((message) => message.startsWith('error:'))) {
  process.exitCode = 1;
}
