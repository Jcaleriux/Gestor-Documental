const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildLocalPreproductionEnvTemplate,
  setupLocalPreproduction,
} = require('../scripts/setup_local_preproduction');

describe('local preproduction setup', () => {
  test('buildLocalPreproductionEnvTemplate usa defaults de preproduccion local', () => {
    const content = buildLocalPreproductionEnvTemplate({
      runtimeBaseDir: path.join('C:', 'sendadocs', 'runtime', 'preprod'),
    });

    expect(content).toContain('NODE_ENV=production');
    expect(content).toContain('PORT=3302');
    expect(content).toContain('DB_NAME=sendadocs_preprod');
    expect(content).toContain('DB_USER=sendadocs_preprod_app');
    expect(content).toContain('PG_BIN_DIR=');
    expect(content).toContain('JWT_SECRET=change-this-before-production');
    expect(content).toContain('CORS_ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173');
    expect(content).toContain('FACTURAS_BASE_DIR=');
  });

  test('setupLocalPreproduction crea runtime dir y env file si no existian', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-preprod-'));
    const envFilePath = path.join(tmpDir, '.env.production.local');
    const runtimeBaseDir = path.join(tmpDir, 'runtime', 'preprod');

    const result = setupLocalPreproduction({
      envFilePath,
      runtimeBaseDir,
    });

    expect(result.envFileCreated).toBe(true);
    expect(fs.existsSync(envFilePath)).toBe(true);
    expect(fs.existsSync(path.join(runtimeBaseDir, 'documentos'))).toBe(true);
    expect(fs.existsSync(path.join(runtimeBaseDir, 'facturas'))).toBe(true);

    const envContent = fs.readFileSync(envFilePath, 'utf8');
    expect(envContent).toContain('DB_NAME=sendadocs_preprod');
    expect(envContent).toContain('PORT=3302');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
