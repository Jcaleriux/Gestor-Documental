const fs = require('fs');
const path = require('path');
const {
  PENDING_PDFS_DIR_NAME,
  PENDING_REPORT_SUFFIX,
  resolvePendingPdfAccess
} = require('../services/pendingPdfFileAccess');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

describe('pendingPdfFileAccess', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-pending-pdf-access-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 });
  });

  const writePendingReport = ({ ingestionId = 'lote-1', cedula = '3-101-887961' } = {}) => {
    const pendingDir = path.join(
      tempRoot,
      'documentos',
      'facturas procesadas',
      PENDING_PDFS_DIR_NAME,
      ingestionId
    );
    fs.mkdirSync(pendingDir, { recursive: true });
    const ruta = path.posix.join(
      'documentos',
      'facturas procesadas',
      PENDING_PDFS_DIR_NAME,
      ingestionId,
      'pendiente.pdf'
    );
    fs.writeFileSync(path.join(pendingDir, 'pendiente.pdf'), 'pdf');
    fs.writeFileSync(
      path.join(pendingDir, `${ingestionId}${PENDING_REPORT_SUFFIX}`),
      JSON.stringify({
        ingestion_id: ingestionId,
        target_dirs: [`documentos/facturas procesadas/${cedula}/${ingestionId}`],
        pdfs: [{ ruta }]
      }, null, 2)
    );
    return ruta;
  };

  test('permite PDF pendiente cuando el lote apunta a sociedad asignada', async () => {
    const ruta = writePendingReport();
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadesByUsuarioId').mockResolvedValue([
      { id: 10, cedula_juridica: '3-101-887961' }
    ]);

    await expect(resolvePendingPdfAccess({
      user: { id: 7, permissions: ['sociedades_asignadas', 'documentos_ver'] },
      rawPath: ruta,
      baseDir: tempRoot
    })).resolves.toMatchObject({
      resource_type: 'pending_pdf',
      sociedad_id: 10
    });
  });

  test('rechaza PDF pendiente cuando no coincide con sociedades asignadas', async () => {
    const ruta = writePendingReport();
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadesByUsuarioId').mockResolvedValue([
      { id: 20, cedula_juridica: '3-101-000000' }
    ]);

    await expect(resolvePendingPdfAccess({
      user: { id: 7, permissions: ['sociedades_asignadas', 'documentos_ver'] },
      rawPath: ruta,
      baseDir: tempRoot
    })).resolves.toBeNull();
  });
});
