const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';
const BASELINE_VERSION = '20260320_0000';
const BASELINE_NAME = 'baseline_00_init_runtime_schema';
const BASELINE_CHECKSUM = 'bootstrap:00_init';
const BASELINE_SOURCE = 'bootstrap';
const RUNTIME_BOOTSTRAP_TABLES = ['facturas', 'sociedades', 'usuarios'];

const normalizeSql = (sql) => sql.replace(/\s+/g, ' ').trim();

const parseMigrationFilename = (filename) => {
  const match = /^(\d{8}_\d{4})_([a-z0-9_]+)\.(sql|js)$/i.exec(filename);

  if (!match) {
    throw new Error(
      `Nombre de migracion invalido: ${filename}. Usa YYYYMMDD_NNNN_descripcion.sql|js`
    );
  }

  return {
    version: match[1],
    name: match[2],
    type: match[3].toLowerCase(),
    filename,
  };
};

const hashContent = (content) =>
  crypto.createHash('sha256').update(content).digest('hex');

const loadMigrations = ({ migrationsDir = MIGRATIONS_DIR } = {}) => {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((filename) => filename.endsWith('.sql') || filename.endsWith('.js'))
    .sort();

  const versions = new Set();

  return entries.map((filename) => {
    const parsed = parseMigrationFilename(filename);

    if (versions.has(parsed.version)) {
      throw new Error(`Version de migracion duplicada: ${parsed.version}`);
    }

    versions.add(parsed.version);

    const filePath = path.join(migrationsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    return {
      ...parsed,
      filePath,
      checksum: hashContent(content),
    };
  });
};

const ensureSchemaMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.${MIGRATIONS_TABLE}
    (
      version character varying(32) NOT NULL,
      name character varying(150) NOT NULL,
      checksum character varying(128),
      source character varying(30) NOT NULL DEFAULT 'migration',
      executed_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      execution_ms integer NOT NULL DEFAULT 0,
      metadata jsonb,
      CONSTRAINT ${MIGRATIONS_TABLE}_pkey PRIMARY KEY (version),
      CONSTRAINT ${MIGRATIONS_TABLE}_source_check CHECK (source IN ('bootstrap', 'migration'))
    );
  `);
};

const schemaMigrationsTableExists = async (client) => {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '${MIGRATIONS_TABLE}'
    ) AS exists
  `);

  return Boolean(result.rows[0]?.exists);
};

const getTrackedMigrations = async (client) => {
  if (!(await schemaMigrationsTableExists(client))) {
    return [];
  }

  const result = await client.query(`
    SELECT version, name, checksum, source
    FROM public.${MIGRATIONS_TABLE}
    ORDER BY version
  `);

  return result.rows;
};

const getPublicTableCount = async (client) => {
  const result = await client.query(`
    SELECT COUNT(*)::int AS total
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '${MIGRATIONS_TABLE}'
  `);

  return result.rows[0]?.total || 0;
};

const hasRuntimeBootstrapTables = async (client) => {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [RUNTIME_BOOTSTRAP_TABLES]
  );

  return result.rows[0]?.total === RUNTIME_BOOTSTRAP_TABLES.length;
};

const ensureBaselineMigration = async (client, { logger = console } = {}) => {
  await ensureSchemaMigrationsTable(client);

  const tracked = await getTrackedMigrations(client);
  if (tracked.length > 0) {
    return { inserted: false, reason: 'already_tracked' };
  }

  const publicTableCount = await getPublicTableCount(client);
  if (publicTableCount === 0) {
    return { inserted: false, reason: 'empty_schema' };
  }

  const looksBootstrapped = await hasRuntimeBootstrapTables(client);
  if (!looksBootstrapped) {
    return { inserted: false, reason: 'unknown_schema_state' };
  }

  await client.query(
    `
      INSERT INTO public.${MIGRATIONS_TABLE}
        (version, name, checksum, source, execution_ms, metadata)
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (version) DO NOTHING
    `,
    [
      BASELINE_VERSION,
      BASELINE_NAME,
      BASELINE_CHECKSUM,
      BASELINE_SOURCE,
      0,
      JSON.stringify({
        bootstrap_file: '00_init.sql',
        note: 'Baseline registrado sobre schema runtime existente',
      }),
    ]
  );

  if (typeof logger.log === 'function') {
    logger.log(`Baseline registrada: ${BASELINE_VERSION} ${BASELINE_NAME}`);
  }

  return { inserted: true, reason: 'bootstrapped_schema' };
};

const validateMigrationTracking = ({ trackedMigrations, fileMigrations }) => {
  const byVersion = new Map(fileMigrations.map((migration) => [migration.version, migration]));
  const checksumMismatches = [];
  const missingFiles = [];

  trackedMigrations.forEach((tracked) => {
    if (tracked.source !== 'migration') {
      return;
    }

    const fileMigration = byVersion.get(tracked.version);

    if (!fileMigration) {
      missingFiles.push(tracked);
      return;
    }

    if (tracked.checksum && tracked.checksum !== fileMigration.checksum) {
      checksumMismatches.push({
        version: tracked.version,
        trackedChecksum: tracked.checksum,
        fileChecksum: fileMigration.checksum,
      });
    }
  });

  return {
    checksumMismatches,
    missingFiles,
  };
};

const executeSqlMigration = async (client, migration) => {
  const sql = fs.readFileSync(migration.filePath, 'utf8');
  await client.query(sql);
};

const executeJsMigration = async (client, migration) => {
  delete require.cache[require.resolve(migration.filePath)];
  const migrationModule = require(migration.filePath);
  const up = typeof migrationModule === 'function' ? migrationModule : migrationModule.up;

  if (typeof up !== 'function') {
    throw new Error(`La migracion JS ${migration.filename} debe exportar una funcion up`);
  }

  await up({ client, migration });
};

const applyMigration = async (client, migration, { logger = console } = {}) => {
  const startedAt = Date.now();

  await client.query('BEGIN');

  try {
    if (migration.type === 'sql') {
      await executeSqlMigration(client, migration);
    } else {
      await executeJsMigration(client, migration);
    }

    const executionMs = Date.now() - startedAt;

    await client.query(
      `
        INSERT INTO public.${MIGRATIONS_TABLE}
          (version, name, checksum, source, execution_ms, metadata)
        VALUES
          ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        migration.version,
        migration.name,
        migration.checksum,
        'migration',
        executionMs,
        JSON.stringify({
          filename: migration.filename,
          type: migration.type,
        }),
      ]
    );

    await client.query('COMMIT');

    if (typeof logger.log === 'function') {
      logger.log(`Migracion aplicada: ${migration.version} ${migration.name}`);
    }

    return {
      ...migration,
      executionMs,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fallo migracion ${migration.version} ${migration.name}: ${error.message}`);
  }
};

const applyPendingMigrationsWithClient = async (
  client,
  { migrationsDir = MIGRATIONS_DIR, logger = console } = {}
) => {
  const fileMigrations = loadMigrations({ migrationsDir });
  await ensureSchemaMigrationsTable(client);

  const baseline = await ensureBaselineMigration(client, { logger });
  const publicTableCount = await getPublicTableCount(client);
  const trackedMigrations = await getTrackedMigrations(client);

  if (publicTableCount === 0 && fileMigrations.length > 0) {
    throw new Error(
      'El schema public esta vacio. Usa npm run db:init o npm run db:reset antes de aplicar migraciones versionadas.'
    );
  }

  if (
    trackedMigrations.length === 0 &&
    publicTableCount > 0 &&
    baseline.reason === 'unknown_schema_state'
  ) {
    throw new Error(
      'El schema actual no coincide con el baseline runtime esperado. Revisa el entorno antes de aplicar migraciones versionadas.'
    );
  }

  const validation = validateMigrationTracking({
    trackedMigrations,
    fileMigrations,
  });

  if (validation.missingFiles.length > 0) {
    throw new Error(
      `Faltan archivos de migracion ya registrados: ${validation.missingFiles
        .map((migration) => migration.version)
        .join(', ')}`
    );
  }

  if (validation.checksumMismatches.length > 0) {
    throw new Error(
      `Hay migraciones versionadas modificadas despues de aplicarse: ${validation.checksumMismatches
        .map((migration) => migration.version)
        .join(', ')}`
    );
  }

  const trackedVersions = new Set(trackedMigrations.map((migration) => migration.version));
  const pendingMigrations = fileMigrations.filter(
    (migration) => !trackedVersions.has(migration.version)
  );

  const appliedNow = [];
  for (const migration of pendingMigrations) {
    appliedNow.push(await applyMigration(client, migration, { logger }));
  }

  return {
    baseline,
    trackedCount: trackedMigrations.length,
    appliedNow,
    pendingCount: pendingMigrations.length,
  };
};

const applyPendingMigrations = async (pool, options = {}) => {
  const client = await pool.connect();

  try {
    return await applyPendingMigrationsWithClient(client, options);
  } finally {
    client.release();
  }
};

const getMigrationStatusWithClient = async (
  client,
  { migrationsDir = MIGRATIONS_DIR } = {}
) => {
  const migrationTableExists = await schemaMigrationsTableExists(client);
  const publicTableCount = await getPublicTableCount(client);
  const bootstrappedSchema = publicTableCount > 0 ? await hasRuntimeBootstrapTables(client) : false;
  const trackedMigrations = migrationTableExists ? await getTrackedMigrations(client) : [];
  const fileMigrations = loadMigrations({ migrationsDir });
  const validation = validateMigrationTracking({
    trackedMigrations,
    fileMigrations,
  });

  const trackedVersions = new Set(trackedMigrations.map((migration) => migration.version));
  const pendingMigrations = fileMigrations.filter(
    (migration) => !trackedVersions.has(migration.version)
  );

  return {
    migrationTableExists,
    publicTableCount,
    bootstrappedSchema,
    trackedMigrations,
    pendingMigrations,
    ...validation,
  };
};

const getMigrationStatus = async (pool, options = {}) => {
  const client = await pool.connect();

  try {
    return await getMigrationStatusWithClient(client, options);
  } finally {
    client.release();
  }
};

module.exports = {
  BASELINE_CHECKSUM,
  BASELINE_NAME,
  BASELINE_SOURCE,
  BASELINE_VERSION,
  MIGRATIONS_DIR,
  MIGRATIONS_TABLE,
  RUNTIME_BOOTSTRAP_TABLES,
  applyPendingMigrations,
  applyPendingMigrationsWithClient,
  ensureBaselineMigration,
  ensureSchemaMigrationsTable,
  getMigrationStatus,
  getMigrationStatusWithClient,
  getTrackedMigrations,
  loadMigrations,
  normalizeSql,
  parseMigrationFilename,
  validateMigrationTracking,
};
