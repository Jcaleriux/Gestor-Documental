const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  BASELINE_VERSION,
  RUNTIME_BOOTSTRAP_TABLES,
  applyPendingMigrationsWithClient,
  loadMigrations,
} = require('../db/migrationManager');

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'SendaDocs-migrations-'));

const removeDir = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

const createFakeClient = ({
  migrationTableExists = false,
  publicTableCount = 3,
  bootstrapTablesPresent = RUNTIME_BOOTSTRAP_TABLES.length,
  trackedMigrations = [],
} = {}) => {
  const state = {
    migrationTableExists,
    publicTableCount,
    bootstrapTablesPresent,
    trackedMigrations: [...trackedMigrations],
    executedSqls: [],
  };

  return {
    state,
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('CREATE TABLE IF NOT EXISTS public.schema_migrations')) {
        state.migrationTableExists = true;
        return { rows: [] };
      }

      if (normalized.startsWith('SELECT EXISTS (')) {
        return { rows: [{ exists: state.migrationTableExists }] };
      }

      if (normalized.startsWith('SELECT version, name, checksum, source FROM public.schema_migrations')) {
        return {
          rows: [...state.trackedMigrations].sort((a, b) => a.version.localeCompare(b.version)),
        };
      }

      if (
        normalized.includes("FROM information_schema.tables") &&
        normalized.includes("table_name <> 'schema_migrations'")
      ) {
        return { rows: [{ total: state.publicTableCount }] };
      }

      if (normalized.includes('table_name = ANY($1::text[])')) {
        expect(params[0]).toEqual(RUNTIME_BOOTSTRAP_TABLES);
        return { rows: [{ total: state.bootstrapTablesPresent }] };
      }

      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rows: [] };
      }

      if (normalized.startsWith('INSERT INTO public.schema_migrations')) {
        const [version, name, checksum, source] = params;

        if (!state.trackedMigrations.some((migration) => migration.version === version)) {
          state.trackedMigrations.push({ version, name, checksum, source });
        }

        return { rows: [] };
      }

      state.executedSqls.push(normalized);
      return { rows: [] };
    },
  };
};

describe('migration manager', () => {
  test('loadMigrations ordena y valida archivos versionados', () => {
    const tempDir = createTempDir();

    try {
      fs.writeFileSync(
        path.join(tempDir, '20260320_0002_beta.sql'),
        'SELECT 2;'
      );
      fs.writeFileSync(
        path.join(tempDir, '20260320_0001_alpha.sql'),
        'SELECT 1;'
      );
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# ignore');

      const migrations = loadMigrations({ migrationsDir: tempDir });

      expect(migrations.map((migration) => migration.version)).toEqual([
        '20260320_0001',
        '20260320_0002',
      ]);
      expect(migrations.map((migration) => migration.name)).toEqual([
        'alpha',
        'beta',
      ]);
    } finally {
      removeDir(tempDir);
    }
  });

  test('applyPendingMigrationsWithClient registra baseline y aplica migraciones pendientes', async () => {
    const tempDir = createTempDir();

    try {
      fs.writeFileSync(
        path.join(tempDir, '20260320_0001_comentario_facturas.sql'),
        "COMMENT ON TABLE public.facturas IS 'Factura';"
      );

      const client = createFakeClient();
      const logger = { log: jest.fn() };

      const result = await applyPendingMigrationsWithClient(client, {
        migrationsDir: tempDir,
        logger,
      });

      expect(result.appliedNow).toHaveLength(1);
      expect(client.state.trackedMigrations.map((migration) => migration.version)).toEqual([
        BASELINE_VERSION,
        '20260320_0001',
      ]);
      expect(client.state.executedSqls).toContain(
        "COMMENT ON TABLE public.facturas IS 'Factura';"
      );
    } finally {
      removeDir(tempDir);
    }
  });

  test('applyPendingMigrationsWithClient protege contra schema vacio', async () => {
    const tempDir = createTempDir();

    try {
      fs.writeFileSync(
        path.join(tempDir, '20260320_0001_comentario_facturas.sql'),
        "COMMENT ON TABLE public.facturas IS 'Factura';"
      );

      const client = createFakeClient({
        publicTableCount: 0,
        bootstrapTablesPresent: 0,
      });

      await expect(
        applyPendingMigrationsWithClient(client, {
          migrationsDir: tempDir,
          logger: { log: jest.fn() },
        })
      ).rejects.toThrow(
        'El schema public esta vacio. Usa npm run db:init o npm run db:reset antes de aplicar migraciones versionadas.'
      );
    } finally {
      removeDir(tempDir);
    }
  });
});
