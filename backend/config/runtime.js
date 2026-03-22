const path = require('path');
const { loadEnvFiles } = require('./env');

loadEnvFiles();

const backendRootDir = path.resolve(__dirname, '..');
const repoRootDir = path.resolve(backendRootDir, '..');

const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  port: 3002,
  jsonBodyLimit: '20mb',
  permissionsCacheTtlMs: 60 * 1000,
  authLoginRateLimitWindowMs: 10 * 60 * 1000,
  authLoginRateLimitMax: 20,
  maxTablaPagoMb: 10,
  maxOrdenCompraMb: 10,
  maxTramitesCaratulaMb: 15,
  maxReservasDocMb: 15,
  watcher: Object.freeze({
    scanDebounceMs: 600,
    lateFilesDelayMs: 2000,
    awfStabilityMs: 2000,
    awfPollMs: 100,
  }),
});

const readRawEnv = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const parsePositiveIntEnv = ({ name, fallback, allowZero = false, label }) => {
  const rawValue = readRawEnv(name);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  const isValid = Number.isInteger(parsed) && (allowZero ? parsed >= 0 : parsed > 0);

  if (!isValid) {
    throw new Error(
      `${label} debe ser un entero ${allowZero ? 'mayor o igual a 0' : 'positivo'}.`
    );
  }

  return parsed;
};

const parsePositiveNumberEnv = ({ name, fallback, label }) => {
  const rawValue = readRawEnv(name);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un numero positivo.`);
  }

  return parsed;
};

const parseStringEnv = ({ name, fallback, label }) => {
  const rawValue = readRawEnv(name);

  if (!rawValue) {
    return fallback;
  }

  if (!String(rawValue).trim()) {
    throw new Error(`${label} no puede ser vacio.`);
  }

  return rawValue;
};

const resolveStorageBaseDir = () => {
  const rawValue = readRawEnv('FACTURAS_BASE_DIR');

  if (!rawValue) {
    return repoRootDir;
  }

  return path.isAbsolute(rawValue)
    ? path.normalize(rawValue)
    : path.resolve(backendRootDir, rawValue);
};

const resolveRuntimeConfig = () => {
  const scanDebounceMs = parsePositiveIntEnv({
    name: 'WATCHER_SCAN_DEBOUNCE_MS',
    fallback: DEFAULT_RUNTIME_CONFIG.watcher.scanDebounceMs,
    allowZero: true,
    label: 'WATCHER_SCAN_DEBOUNCE_MS',
  });
  const lateFilesDelayMs = parsePositiveIntEnv({
    name: 'WATCHER_LATE_FILES_DELAY_MS',
    fallback: DEFAULT_RUNTIME_CONFIG.watcher.lateFilesDelayMs,
    allowZero: true,
    label: 'WATCHER_LATE_FILES_DELAY_MS',
  });

  return {
    backendRootDir,
    repoRootDir,
    storageBaseDir: resolveStorageBaseDir(),
    port: parsePositiveIntEnv({
      name: 'PORT',
      fallback: DEFAULT_RUNTIME_CONFIG.port,
      label: 'PORT',
    }),
    jsonBodyLimit: parseStringEnv({
      name: 'JSON_BODY_LIMIT',
      fallback: DEFAULT_RUNTIME_CONFIG.jsonBodyLimit,
      label: 'JSON_BODY_LIMIT',
    }),
    permissionsCacheTtlMs: parsePositiveIntEnv({
      name: 'PERMISSIONS_CACHE_TTL_MS',
      fallback: DEFAULT_RUNTIME_CONFIG.permissionsCacheTtlMs,
      allowZero: true,
      label: 'PERMISSIONS_CACHE_TTL_MS',
    }),
    authLoginRateLimitWindowMs: parsePositiveIntEnv({
      name: 'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',
      fallback: DEFAULT_RUNTIME_CONFIG.authLoginRateLimitWindowMs,
      allowZero: true,
      label: 'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',
    }),
    authLoginRateLimitMax: parsePositiveIntEnv({
      name: 'AUTH_LOGIN_RATE_LIMIT_MAX',
      fallback: DEFAULT_RUNTIME_CONFIG.authLoginRateLimitMax,
      allowZero: true,
      label: 'AUTH_LOGIN_RATE_LIMIT_MAX',
    }),
    maxTablaPagoMb: parsePositiveNumberEnv({
      name: 'TABLAS_PAGO_MAX_FILE_MB',
      fallback: DEFAULT_RUNTIME_CONFIG.maxTablaPagoMb,
      label: 'TABLAS_PAGO_MAX_FILE_MB',
    }),
    maxOrdenCompraMb: parsePositiveNumberEnv({
      name: 'ORDENES_COMPRA_MAX_FILE_MB',
      fallback: DEFAULT_RUNTIME_CONFIG.maxOrdenCompraMb,
      label: 'ORDENES_COMPRA_MAX_FILE_MB',
    }),
    maxTramitesCaratulaMb: parsePositiveNumberEnv({
      name: 'TRAMITES_CARATULA_MAX_FILE_MB',
      fallback: DEFAULT_RUNTIME_CONFIG.maxTramitesCaratulaMb,
      label: 'TRAMITES_CARATULA_MAX_FILE_MB',
    }),
    maxReservasDocMb: parsePositiveNumberEnv({
      name: 'RESERVAS_DOC_MAX_FILE_MB',
      fallback: DEFAULT_RUNTIME_CONFIG.maxReservasDocMb,
      label: 'RESERVAS_DOC_MAX_FILE_MB',
    }),
    watcher: {
      scanDebounceMs,
      lateFilesDelayMs,
      awfStabilityMs: parsePositiveIntEnv({
        name: 'WATCHER_AWF_STABILITY_MS',
        fallback: DEFAULT_RUNTIME_CONFIG.watcher.awfStabilityMs,
        allowZero: true,
        label: 'WATCHER_AWF_STABILITY_MS',
      }),
      awfPollMs: parsePositiveIntEnv({
        name: 'WATCHER_AWF_POLL_MS',
        fallback: DEFAULT_RUNTIME_CONFIG.watcher.awfPollMs,
        allowZero: true,
        label: 'WATCHER_AWF_POLL_MS',
      }),
      scanDelayMs: scanDebounceMs + lateFilesDelayMs,
    },
  };
};

const runtimeConfig = resolveRuntimeConfig();

module.exports = {
  DEFAULT_RUNTIME_CONFIG,
  resolveRuntimeConfig,
  runtimeConfig,
};
