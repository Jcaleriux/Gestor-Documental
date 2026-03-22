const path = require('path');
const {
  DEFAULT_RUNTIME_CONFIG,
  resolveRuntimeConfig,
} = require('../config/runtime');

const RELEVANT_ENV_KEYS = [
  'PORT',
  'FACTURAS_BASE_DIR',
  'JSON_BODY_LIMIT',
  'PERMISSIONS_CACHE_TTL_MS',
  'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',
  'AUTH_LOGIN_RATE_LIMIT_MAX',
  'TABLAS_PAGO_MAX_FILE_MB',
  'ORDENES_COMPRA_MAX_FILE_MB',
  'RESERVAS_DOC_MAX_FILE_MB',
  'WATCHER_SCAN_DEBOUNCE_MS',
  'WATCHER_LATE_FILES_DELAY_MS',
  'WATCHER_AWF_STABILITY_MS',
  'WATCHER_AWF_POLL_MS',
];

const ORIGINAL_ENV = new Map(
  RELEVANT_ENV_KEYS.map((key) => [key, process.env[key]])
);

const resetRelevantEnv = () => {
  RELEVANT_ENV_KEYS.forEach((key) => {
    delete process.env[key];
  });
};

const restoreRelevantEnv = () => {
  RELEVANT_ENV_KEYS.forEach((key) => {
    const originalValue = ORIGINAL_ENV.get(key);

    if (typeof originalValue === 'undefined') {
      delete process.env[key];
      return;
    }

    process.env[key] = originalValue;
  });
};

describe('runtime config', () => {
  beforeEach(() => {
    resetRelevantEnv();
  });

  afterAll(() => {
    restoreRelevantEnv();
  });

  test('resolveRuntimeConfig usa defaults seguros para runtime local', () => {
    const config = resolveRuntimeConfig();

    expect(config.port).toBe(DEFAULT_RUNTIME_CONFIG.port);
    expect(config.jsonBodyLimit).toBe(DEFAULT_RUNTIME_CONFIG.jsonBodyLimit);
    expect(config.permissionsCacheTtlMs).toBe(DEFAULT_RUNTIME_CONFIG.permissionsCacheTtlMs);
    expect(config.authLoginRateLimitWindowMs).toBe(DEFAULT_RUNTIME_CONFIG.authLoginRateLimitWindowMs);
    expect(config.authLoginRateLimitMax).toBe(DEFAULT_RUNTIME_CONFIG.authLoginRateLimitMax);
    expect(config.maxTablaPagoMb).toBe(DEFAULT_RUNTIME_CONFIG.maxTablaPagoMb);
    expect(config.maxOrdenCompraMb).toBe(DEFAULT_RUNTIME_CONFIG.maxOrdenCompraMb);
    expect(config.maxReservasDocMb).toBe(DEFAULT_RUNTIME_CONFIG.maxReservasDocMb);
    expect(config.storageBaseDir).toBe(path.resolve(__dirname, '..', '..'));
    expect(config.watcher).toMatchObject({
      scanDebounceMs: DEFAULT_RUNTIME_CONFIG.watcher.scanDebounceMs,
      lateFilesDelayMs: DEFAULT_RUNTIME_CONFIG.watcher.lateFilesDelayMs,
      awfStabilityMs: DEFAULT_RUNTIME_CONFIG.watcher.awfStabilityMs,
      awfPollMs: DEFAULT_RUNTIME_CONFIG.watcher.awfPollMs,
      scanDelayMs:
        DEFAULT_RUNTIME_CONFIG.watcher.scanDebounceMs
        + DEFAULT_RUNTIME_CONFIG.watcher.lateFilesDelayMs,
    });
  });

  test('resolveRuntimeConfig resuelve FACTURAS_BASE_DIR relativo al backend', () => {
    process.env.FACTURAS_BASE_DIR = '.runtime-storage';

    const config = resolveRuntimeConfig();

    expect(config.storageBaseDir).toBe(
      path.resolve(path.join(__dirname, '..'), '.runtime-storage')
    );
  });

  test('resolveRuntimeConfig acepta overrides explicitos y deriva scanDelay', () => {
    process.env.PORT = '4100';
    process.env.JSON_BODY_LIMIT = '25mb';
    process.env.PERMISSIONS_CACHE_TTL_MS = '90000';
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = '120000';
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '8';
    process.env.TABLAS_PAGO_MAX_FILE_MB = '12';
    process.env.ORDENES_COMPRA_MAX_FILE_MB = '18';
    process.env.RESERVAS_DOC_MAX_FILE_MB = '20';
    process.env.WATCHER_SCAN_DEBOUNCE_MS = '700';
    process.env.WATCHER_LATE_FILES_DELAY_MS = '3000';
    process.env.WATCHER_AWF_STABILITY_MS = '2500';
    process.env.WATCHER_AWF_POLL_MS = '150';

    const config = resolveRuntimeConfig();

    expect(config).toMatchObject({
      port: 4100,
      jsonBodyLimit: '25mb',
      permissionsCacheTtlMs: 90000,
      authLoginRateLimitWindowMs: 120000,
      authLoginRateLimitMax: 8,
      maxTablaPagoMb: 12,
      maxOrdenCompraMb: 18,
      maxReservasDocMb: 20,
      watcher: {
        scanDebounceMs: 700,
        lateFilesDelayMs: 3000,
        awfStabilityMs: 2500,
        awfPollMs: 150,
        scanDelayMs: 3700,
      },
    });
  });

  test('resolveRuntimeConfig falla rapido ante valores invalidos', () => {
    process.env.PORT = 'abc';
    expect(() => resolveRuntimeConfig()).toThrow('PORT debe ser un entero positivo.');

    resetRelevantEnv();
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '-1';
    expect(() => resolveRuntimeConfig()).toThrow(
      'AUTH_LOGIN_RATE_LIMIT_MAX debe ser un entero mayor o igual a 0.'
    );

    resetRelevantEnv();
    process.env.TABLAS_PAGO_MAX_FILE_MB = '0';
    expect(() => resolveRuntimeConfig()).toThrow('TABLAS_PAGO_MAX_FILE_MB debe ser un numero positivo.');

    resetRelevantEnv();
    process.env.WATCHER_AWF_POLL_MS = '-1';
    expect(() => resolveRuntimeConfig()).toThrow(
      'WATCHER_AWF_POLL_MS debe ser un entero mayor o igual a 0.'
    );
  });
});
