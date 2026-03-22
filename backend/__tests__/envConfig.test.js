const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_AUTH_CONFIG,
  DEFAULT_DB_CONFIG,
  loadEnvFiles,
  resetEnvFilesLoadedState,
  resolveConfiguredEnvFilePaths,
  resolveAuthConfig,
  resolveDbConfig,
} = require('../config/env');

const RELEVANT_ENV_KEYS = [
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'BCRYPT_ROUNDS',
  'NOVOGAR_ENV_FILE',
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

describe('env config', () => {
  beforeEach(() => {
    resetRelevantEnv();
  });

  afterAll(() => {
    restoreRelevantEnv();
  });

  test('resolveDbConfig usa DB_* explicitos cuando existen', () => {
    process.env.DB_HOST = 'db.internal';
    process.env.DB_PORT = '5544';
    process.env.DB_USER = 'novogar';
    process.env.DB_PASSWORD = 'segura';
    process.env.DB_NAME = 'novogar_prod';

    expect(resolveDbConfig()).toEqual({
      host: 'db.internal',
      port: 5544,
      user: 'novogar',
      password: 'segura',
      database: 'novogar_prod',
    });
  });

  test('resolveDbConfig soporta compatibilidad con variables PG*', () => {
    process.env.PGHOST = 'pg.internal';
    process.env.PGPORT = '6432';
    process.env.PGUSER = 'pguser';
    process.env.PGPASSWORD = 'pgpass';
    process.env.PGDATABASE = 'pgdb';

    expect(resolveDbConfig()).toEqual({
      host: 'pg.internal',
      port: 6432,
      user: 'pguser',
      password: 'pgpass',
      database: 'pgdb',
    });
  });

  test('resolveDbConfig usa defaults dev fuera de produccion', () => {
    expect(resolveDbConfig()).toEqual(DEFAULT_DB_CONFIG);
  });

  test('resolveDbConfig exige variables explicitas en produccion', () => {
    process.env.NODE_ENV = 'production';

    expect(() => resolveDbConfig()).toThrow(
      'Configuracion de DB incompleta para produccion.'
    );
  });

  test('resolveDbConfig rechaza DB_PORT invalido en produccion', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_HOST = 'db.internal';
    process.env.DB_PORT = 'abc';
    process.env.DB_USER = 'novogar';
    process.env.DB_PASSWORD = 'segura';
    process.env.DB_NAME = 'novogar_prod';

    expect(() => resolveDbConfig()).toThrow(
      'DB_PORT debe ser un entero positivo en produccion.'
    );
  });

  test('resolveAuthConfig usa defaults dev fuera de produccion', () => {
    expect(resolveAuthConfig()).toEqual({
      JWT_SECRET: DEFAULT_AUTH_CONFIG.jwtSecret,
      JWT_EXPIRES_IN: DEFAULT_AUTH_CONFIG.jwtExpiresIn,
      BCRYPT_ROUNDS: DEFAULT_AUTH_CONFIG.bcryptRounds,
    });
  });

  test('resolveAuthConfig rechaza JWT por defecto en produccion', () => {
    process.env.NODE_ENV = 'production';

    expect(() => resolveAuthConfig()).toThrow(
      'JWT_SECRET es obligatorio en produccion y no puede usar el valor por defecto.'
    );
  });

  test('resolveAuthConfig acepta JWT explicito y rounds configurables', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'super-secreto-produccion';
    process.env.JWT_EXPIRES_IN = '12h';
    process.env.BCRYPT_ROUNDS = '14';
    process.env.DB_HOST = 'db.internal';
    process.env.DB_PORT = '5432';
    process.env.DB_USER = 'novogar';
    process.env.DB_PASSWORD = 'segura';
    process.env.DB_NAME = 'novogar_prod';

    expect(resolveAuthConfig()).toEqual({
      JWT_SECRET: 'super-secreto-produccion',
      JWT_EXPIRES_IN: '12h',
      BCRYPT_ROUNDS: 14,
    });
  });

  test('loadEnvFiles soporta un env file explicito para preproduccion local', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novogar-env-config-'));
    const explicitEnvFilePath = path.join(tmpDir, '.env.production.local');

    fs.writeFileSync(
      explicitEnvFilePath,
      [
        'NODE_ENV=production',
        'DB_HOST=preprod-db.local',
        'DB_PORT=5544',
        'DB_USER=preprod_user',
        'DB_PASSWORD=super-segura',
        'DB_NAME=novogar_preprod',
        'JWT_SECRET=jwt-preprod-segura',
      ].join('\n'),
      'utf8'
    );

    process.env.NOVOGAR_ENV_FILE = explicitEnvFilePath;
    resetEnvFilesLoadedState();
    loadEnvFiles({ forceReload: true });

    expect(resolveConfiguredEnvFilePaths()).toContain(explicitEnvFilePath);
    expect(resolveDbConfig()).toEqual({
      host: 'preprod-db.local',
      port: 5544,
      user: 'preprod_user',
      password: 'super-segura',
      database: 'novogar_preprod',
    });
    expect(resolveAuthConfig()).toMatchObject({
      JWT_SECRET: 'jwt-preprod-segura',
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
