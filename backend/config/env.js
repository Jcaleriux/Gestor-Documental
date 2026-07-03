const fs = require('fs');
const path = require('path');

const ENV_FILES_LOADED_FLAG = '__SENDADOCS_ENV_FILES_LOADED__';

const DEFAULT_DB_CONFIG = Object.freeze({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'sendadocs_db',
});

const DEFAULT_AUTH_CONFIG = Object.freeze({
  jwtSecret: 'dev-secret',
  jwtExpiresIn: '8h',
  bcryptRounds: 12,
});

const stripWrappingQuotes = (value) => {
  if (value.length < 2) {
    return value;
  }

  const startsWithSingle = value.startsWith("'");
  const endsWithSingle = value.endsWith("'");
  const startsWithDouble = value.startsWith('"');
  const endsWithDouble = value.endsWith('"');

  if ((startsWithSingle && endsWithSingle) || (startsWithDouble && endsWithDouble)) {
    return value.slice(1, -1);
  }

  return value;
};

const parseEnvFile = (content) => {
  const entries = {};

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const normalizedLine = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const separatorIndex = normalizedLine.indexOf('=');

    if (separatorIndex <= 0) {
      return;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const rawValue = normalizedLine.slice(separatorIndex + 1).trim();

    if (!key) {
      return;
    }

    entries[key] = stripWrappingQuotes(rawValue);
  });

  return entries;
};

const resolveConfiguredEnvFilePaths = () => {
  const backendRootDir = path.join(__dirname, '..');
  const envFilePaths = [
    path.join(backendRootDir, '.env'),
    path.join(backendRootDir, '.env.local'),
  ];
  const explicitEnvFile = process.env.SENDADOCS_ENV_FILE;

  if (typeof explicitEnvFile === 'string' && explicitEnvFile.trim()) {
    envFilePaths.push(
      path.isAbsolute(explicitEnvFile.trim())
        ? explicitEnvFile.trim()
        : path.resolve(backendRootDir, explicitEnvFile.trim())
    );
  }

  return envFilePaths;
};

const resetEnvFilesLoadedState = () => {
  delete global[ENV_FILES_LOADED_FLAG];
};

const loadEnvFiles = ({ forceReload = false } = {}) => {
  if (forceReload) {
    resetEnvFilesLoadedState();
  }

  if (global[ENV_FILES_LOADED_FLAG]) {
    return;
  }

  const envFilePaths = resolveConfiguredEnvFilePaths();
  const loadedKeys = new Set();

  envFilePaths.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const fileEntries = parseEnvFile(fs.readFileSync(filePath, 'utf8'));

    Object.entries(fileEntries).forEach(([key, value]) => {
      const alreadySetExternally = Object.prototype.hasOwnProperty.call(process.env, key) && !loadedKeys.has(key);

      if (alreadySetExternally) {
        return;
      }

      process.env[key] = value;
      loadedKeys.add(key);
    });
  });

  global[ENV_FILES_LOADED_FLAG] = true;
};

const readEnvSetting = (names, fallback, options = {}) => {
  const { allowEmpty = false } = options;

  for (const name of names) {
    const rawValue = process.env[name];

    if (typeof rawValue !== 'string') {
      continue;
    }

    if (!allowEmpty && rawValue.trim() === '') {
      continue;
    }

    return {
      key: name,
      source: 'env',
      value: rawValue,
    };
  }

  return {
    key: names[0] || null,
    source: 'fallback',
    value: fallback,
  };
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const isProductionRuntime = () => process.env.NODE_ENV === 'production';

const parsePortSetting = (setting) => {
  const parsed = Number.parseInt(String(setting.value), 10);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  if (isProductionRuntime() && setting.source === 'env') {
    throw new Error('DB_PORT debe ser un entero positivo en produccion.');
  }

  return DEFAULT_DB_CONFIG.port;
};

const resolveDbConfig = () => {
  loadEnvFiles();

  const host = readEnvSetting(['DB_HOST', 'PGHOST'], DEFAULT_DB_CONFIG.host);
  const port = readEnvSetting(['DB_PORT', 'PGPORT'], String(DEFAULT_DB_CONFIG.port));
  const user = readEnvSetting(['DB_USER', 'PGUSER'], DEFAULT_DB_CONFIG.user);
  const password = readEnvSetting(['DB_PASSWORD', 'PGPASSWORD'], DEFAULT_DB_CONFIG.password, { allowEmpty: true });
  const database = readEnvSetting(['DB_NAME', 'PGDATABASE'], DEFAULT_DB_CONFIG.database);

  if (isProductionRuntime()) {
    const missingKeys = [host, port, user, password, database]
      .filter((setting) => setting.source === 'fallback')
      .map((setting) => setting.key || 'unknown');

    if (missingKeys.length > 0) {
      throw new Error(
        `Configuracion de DB incompleta para produccion. Define ${missingKeys.join(', ')} en el entorno.`
      );
    }
  }

  return {
    host: host.value,
    port: parsePortSetting(port),
    user: user.value,
    password: password.value,
    database: database.value,
  };
};

const resolveAuthConfig = () => {
  loadEnvFiles();

  const jwtSecret = readEnvSetting(['JWT_SECRET'], DEFAULT_AUTH_CONFIG.jwtSecret);
  const jwtExpiresIn = readEnvSetting(['JWT_EXPIRES_IN'], DEFAULT_AUTH_CONFIG.jwtExpiresIn);
  const bcryptRounds = readEnvSetting(['BCRYPT_ROUNDS'], String(DEFAULT_AUTH_CONFIG.bcryptRounds));

  if (isProductionRuntime()) {
    if (jwtSecret.source === 'fallback' || jwtSecret.value === DEFAULT_AUTH_CONFIG.jwtSecret) {
      throw new Error('JWT_SECRET es obligatorio en produccion y no puede usar el valor por defecto.');
    }
  }

  return {
    JWT_SECRET: jwtSecret.value,
    JWT_EXPIRES_IN: jwtExpiresIn.value,
    BCRYPT_ROUNDS: toPositiveInt(bcryptRounds.value, DEFAULT_AUTH_CONFIG.bcryptRounds),
  };
};

loadEnvFiles();

module.exports = {
  DEFAULT_AUTH_CONFIG,
  DEFAULT_DB_CONFIG,
  loadEnvFiles,
  parseEnvFile,
  readEnvSetting,
  resetEnvFilesLoadedState,
  resolveAuthConfig,
  resolveDbConfig,
  resolveConfiguredEnvFilePaths,
};
