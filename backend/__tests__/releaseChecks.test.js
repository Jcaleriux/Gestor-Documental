const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  checkBootstrapSchema,
  runReleaseChecks,
} = require('../scripts/release_checks');

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'novogar-release-'));

const removeDir = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

describe('backend release checks', () => {
  test('runReleaseChecks valida el release backend actual', async () => {
    const logger = { log: jest.fn() };

    const result = await runReleaseChecks({ logger });

    expect(result.migrationCount).toBeGreaterThan(0);
    expect(logger.log).toHaveBeenCalledWith('Release checks backend: OK');
  });

  test('checkBootstrapSchema exige baseline runtime en 00_init.sql', () => {
    const tempDir = createTempDir();

    try {
      const initSqlPath = path.join(tempDir, '00_init.sql');
      fs.writeFileSync(
        initSqlPath,
        'CREATE TABLE IF NOT EXISTS public.schema_migrations (id serial primary key);'
      );

      expect(() =>
        checkBootstrapSchema({ initSqlPath })
      ).toThrow(
        '00_init.sql debe registrar el baseline runtime.'
      );
    } finally {
      removeDir(tempDir);
    }
  });
});
