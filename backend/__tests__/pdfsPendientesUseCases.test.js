const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPdfsPendientesUseCases } = require('../services/pdfsPendientesUseCases');

const toPosix = (value) => String(value || '').replace(/\\/g, '/');

const writeJson = (filePath, payload) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
};

const createPendingFixture = ({
  root,
  ingestionId = '20260625_100000_TEST',
  targetDirs,
  originalName = 'factura-adjunta.pdf'
} = {}) => {
  const pendingDir = path.join(root, 'documentos', 'facturas procesadas', 'pdfs_pendientes', ingestionId);
  const pdfName = `${ingestionId}.PDF.1.pdf`;
  const pdfPath = path.join(pendingDir, pdfName);
  const reportPath = path.join(pendingDir, `${ingestionId}.pdfs_pendientes.json`);
  const ruta = toPosix(path.join('documentos', 'facturas procesadas', 'pdfs_pendientes', ingestionId, pdfName));

  fs.mkdirSync(pendingDir, { recursive: true });
  fs.writeFileSync(pdfPath, 'PDF pendiente');
  writeJson(reportPath, {
    ingestion_id: ingestionId,
    motivo: 'Hay PDFs sin asociacion confiable.',
    target_dirs: targetDirs || [toPosix(path.join('documentos', 'facturas procesadas', '3101000000', ingestionId))],
    pdfs: [
      {
        savedAs: pdfName,
        originalName,
        ruta,
        motivo: 'PDF sin asociacion confiable con DOC/XML'
      }
    ]
  });

  return {
    ingestionId,
    pendingDir,
    pdfName,
    pdfPath,
    reportPath,
    ruta
  };
};

describe('pdfsPendientesUseCases', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfs-pendientes-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('lista PDFs pendientes desde reportes de importacion', async () => {
    const fixture = createPendingFixture({ root: tempRoot });
    const useCases = createPdfsPendientesUseCases({
      baseDir: tempRoot,
      repo: {}
    });

    const result = await useCases.listPendingPdfs();

    expect(result.summary).toEqual({ totalPdfs: 1, totalLotes: 1 });
    expect(result.items).toEqual([
      expect.objectContaining({
        ingestion_id: fixture.ingestionId,
        savedAs: fixture.pdfName,
        originalName: 'factura-adjunta.pdf',
        ruta: fixture.ruta,
        exists: true,
        report_path: toPosix(path.relative(tempRoot, fixture.reportPath))
      })
    ]);
  });

  test('filtra PDFs pendientes por sociedad usando el directorio destino', async () => {
    const fixture = createPendingFixture({ root: tempRoot });
    const repo = {
      getSociedadById: jest.fn(async (sociedadId) => ({
        id: sociedadId,
        cedula_juridica: sociedadId === 7 ? '3101000000' : '3101999999'
      })),
      searchFacturaCandidates: jest.fn().mockResolvedValue([])
    };
    const useCases = createPdfsPendientesUseCases({
      baseDir: tempRoot,
      repo
    });

    await expect(useCases.listPendingPdfs({ sociedadId: 7 }))
      .resolves.toMatchObject({ summary: { totalPdfs: 1, totalLotes: 1 } });
    await expect(useCases.listPendingPdfs({ sociedadId: 8 }))
      .resolves.toMatchObject({ summary: { totalPdfs: 0, totalLotes: 0 } });

    expect(fixture.ruta).toContain('pdfs_pendientes');
  });

  test('filtra PDFs pendientes sin directorio destino buscando documentos de la sociedad', async () => {
    createPendingFixture({
      root: tempRoot,
      targetDirs: [],
      originalName: 'Factura 00100001010000009999.pdf'
    });
    const repo = {
      getSociedadById: jest.fn(async (sociedadId) => ({
        id: sociedadId,
        cedula_juridica: sociedadId === 7 ? '3101000000' : '3101999999'
      })),
      searchFacturaCandidates: jest.fn(async ({ sociedadId, query }) => (
        sociedadId === 7 && String(query).includes('00100001010000009999')
          ? [{ id: 99, sociedad_id: 7 }]
          : []
      ))
    };
    const useCases = createPdfsPendientesUseCases({
      baseDir: tempRoot,
      repo
    });

    await expect(useCases.listPendingPdfs({ sociedadId: 7 }))
      .resolves.toMatchObject({ summary: { totalPdfs: 1, totalLotes: 1 } });
    await expect(useCases.listPendingPdfs({ sociedadId: 8 }))
      .resolves.toMatchObject({ summary: { totalPdfs: 0, totalLotes: 0 } });
  });

  test('asocia un PDF pendiente moviendolo al directorio de la factura y actualiza el reporte', async () => {
    const fixture = createPendingFixture({ root: tempRoot });
    const facturaDir = path.join(tempRoot, 'documentos', 'facturas procesadas', '3101000000', fixture.ingestionId);
    const xmlPath = path.join(facturaDir, `${fixture.ingestionId}.DOC.1.xml`);
    fs.mkdirSync(facturaDir, { recursive: true });
    fs.writeFileSync(xmlPath, '<xml />');

    const repo = {
      getFacturaForPdfAssignment: jest.fn().mockResolvedValue({
        id: 42,
        sociedad_id: 7,
        clave: 'clave-42',
        consecutivo: '00100001010000000042',
        ruta_xml: toPosix(path.relative(tempRoot, xmlPath)),
        ruta_pdf: null
      }),
      updateFacturaRutaPdf: jest.fn(async ({ facturaId, rutaPdf }) => ({
        id: facturaId,
        ruta_pdf: rutaPdf
      }))
    };
    const useCases = createPdfsPendientesUseCases({
      baseDir: tempRoot,
      repo,
      runInTransaction: (handler) => handler({})
    });

    const result = await useCases.assignPendingPdf({
      ingestionId: fixture.ingestionId,
      pdfRuta: fixture.ruta,
      facturaId: 42,
      sociedadId: 7,
      overwrite: false,
      usuario: 'qa@example.com'
    });

    const expectedDestination = path.join(facturaDir, fixture.pdfName);
    expect(fs.existsSync(fixture.pdfPath)).toBe(false);
    expect(fs.existsSync(expectedDestination)).toBe(true);
    expect(repo.updateFacturaRutaPdf).toHaveBeenCalledWith({
      facturaId: 42,
      rutaPdf: toPosix(path.relative(tempRoot, expectedDestination))
    }, {});
    expect(result.factura).toEqual(expect.objectContaining({
      id: 42,
      ruta_pdf: toPosix(path.relative(tempRoot, expectedDestination))
    }));

    const report = JSON.parse(fs.readFileSync(fixture.reportPath, 'utf8'));
    expect(report.pdfs).toHaveLength(0);
    expect(report.resueltos).toEqual([
      expect.objectContaining({
        ruta_origen: fixture.ruta,
        ruta_destino: toPosix(path.relative(tempRoot, expectedDestination)),
        factura_id: 42,
        usuario: 'qa@example.com'
      })
    ]);
  });

  test('rechaza asociacion si la factura ya tiene PDF y no se confirma reemplazo', async () => {
    const fixture = createPendingFixture({ root: tempRoot });
    const facturaDir = path.join(tempRoot, 'documentos', 'facturas procesadas', '3101000000', fixture.ingestionId);
    const xmlPath = path.join(facturaDir, `${fixture.ingestionId}.DOC.1.xml`);
    fs.mkdirSync(facturaDir, { recursive: true });
    fs.writeFileSync(xmlPath, '<xml />');

    const repo = {
      getFacturaForPdfAssignment: jest.fn().mockResolvedValue({
        id: 42,
        sociedad_id: 7,
        clave: 'clave-42',
        consecutivo: '00100001010000000042',
        ruta_xml: toPosix(path.relative(tempRoot, xmlPath)),
        ruta_pdf: toPosix(path.join('documentos', 'facturas procesadas', '3101000000', fixture.ingestionId, 'actual.pdf'))
      }),
      updateFacturaRutaPdf: jest.fn()
    };
    const useCases = createPdfsPendientesUseCases({
      baseDir: tempRoot,
      repo,
      runInTransaction: (handler) => handler({})
    });

    await expect(useCases.assignPendingPdf({
      ingestionId: fixture.ingestionId,
      pdfRuta: fixture.ruta,
      facturaId: 42,
      sociedadId: 7,
      overwrite: false
    })).rejects.toMatchObject({
      status: 409,
      data: expect.objectContaining({ requiresOverwrite: true })
    });

    expect(fs.existsSync(fixture.pdfPath)).toBe(true);
    expect(repo.updateFacturaRutaPdf).not.toHaveBeenCalled();
  });
});
