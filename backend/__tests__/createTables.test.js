jest.mock('../db/index', () => ({
  query: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../db/migrationManager', () => ({
  applyPendingMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const pool = require('../db/index');
const fs = require('fs');
const { applyPendingMigrations } = require('../db/migrationManager');
const { createTables } = require('../db/create_tables');

describe('createTables bootstrap', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('SELECT 1;');
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  test('permite bootstrap cuando solo schema_migrations existe como tabla previa', async () => {
    pool.query.mockImplementation(async (sql) => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('SELECT COUNT(*)::int AS total')) {
        expect(normalized).toContain("table_name <> 'schema_migrations'");
        return { rows: [{ total: 0 }] };
      }

      if (normalized.startsWith('SELECT tablename FROM pg_tables')) {
        return {
          rows: [
            { tablename: 'schema_migrations' },
            { tablename: 'facturas' },
          ],
        };
      }

      if (normalized.startsWith('SELECT column_name FROM information_schema.columns')) {
        return { rows: [{ column_name: 'estado' }] };
      }

      return { rows: [] };
    });

    await createTables();

    expect(fs.readFileSync).toHaveBeenCalled();
    expect(applyPendingMigrations).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
  });

  test('corta temprano si ya existen tablas runtime distintas a schema_migrations', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ total: 3 }] });

    await createTables();

    expect(applyPendingMigrations).not.toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('El schema public ya tiene tablas.')
    );
  });
});
