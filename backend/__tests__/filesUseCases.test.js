const fs = require('fs');
const path = require('path');
const { createFilesUseCases } = require('../services/filesUseCases');

describe('filesUseCases', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(process.cwd(), 'tmp-files-usecases-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 });
  });

  it('resuelve archivos relativos con baseDir en subdirectorio backend', () => {
    const fakeBackendDir = path.join(tempRoot, 'backend');
    const targetDir = path.join(tempRoot, 'documentos', 'facturas procesadas');
    const targetFile = path.join(targetDir, 'doc.pdf');

    fs.mkdirSync(fakeBackendDir, { recursive: true });
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, 'pdf');

    const useCases = createFilesUseCases({ baseDir: fakeBackendDir });
    const result = useCases.getPdfFile({ rawPath: 'documentos/facturas procesadas/doc.pdf' });

    expect(result.fullPath).toBe(targetFile);
    expect(result.filename).toBe('doc.pdf');
  });

  it('acepta rutas absolutas cuando existen', () => {
    const targetDir = path.join(tempRoot, 'documentos', 'facturas procesadas');
    const targetFile = path.join(targetDir, 'absoluto.pdf');

    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, 'pdf');

    const useCases = createFilesUseCases({ baseDir: path.join(tempRoot, 'backend') });
    const result = useCases.getPdfFile({ rawPath: targetFile });

    expect(result.fullPath).toBe(path.normalize(targetFile));
    expect(result.filename).toBe('absoluto.pdf');
  });

  it('busca por basename en documentos cuando la ruta no coincide', () => {
    const fakeBackendDir = path.join(tempRoot, 'backend');
    const realDir = path.join(tempRoot, 'documentos', 'facturas procesadas', '3101887961', 'lote-a');
    const realFile = path.join(realDir, 'ingestion-123.PDF.1.pdf');

    fs.mkdirSync(fakeBackendDir, { recursive: true });
    fs.mkdirSync(realDir, { recursive: true });
    fs.writeFileSync(realFile, 'pdf');

    const useCases = createFilesUseCases({ baseDir: fakeBackendDir });
    const result = useCases.getPdfFile({
      rawPath: 'documentos/facturas procesadas/otro-lote/ingestion-123.PDF.1.pdf'
    });

    expect(result.fullPath).toBe(realFile);
    expect(result.filename).toBe('ingestion-123.PDF.1.pdf');
  });

  it('resuelve rutas legacy hacia la carpeta nueva de documentos', () => {
    const fakeBackendDir = path.join(tempRoot, 'backend');
    const realDir = path.join(tempRoot, 'documentos', 'facturas procesadas');
    const realFile = path.join(realDir, 'legacy.pdf');

    fs.mkdirSync(fakeBackendDir, { recursive: true });
    fs.mkdirSync(realDir, { recursive: true });
    fs.writeFileSync(realFile, 'pdf');

    const useCases = createFilesUseCases({ baseDir: fakeBackendDir });
    const result = useCases.getPdfFile({ rawPath: 'facturas/procesadas/legacy.pdf' });

    expect(result.fullPath).toBe(realFile);
    expect(result.filename).toBe('legacy.pdf');
  });

  it('rechaza path traversal', () => {
    const useCases = createFilesUseCases({ baseDir: tempRoot });
    expect(() => useCases.getPdfFile({ rawPath: '../secreto.pdf' })).toThrow('Invalid path');
  });
});
