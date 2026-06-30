const fs = require('fs');
const os = require('os');
const path = require('path');
const { createFacturasManifestResolver } = require('../services/facturasManifestResolver');

const toPortablePath = (filePath) => filePath.replace(/\\/g, '/');

describe('facturasManifestResolver', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'facturas-manifest-resolver-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('lee el manifiesto mas reciente desde la carpeta del XML relativo', () => {
    const loteDir = path.join(tempRoot, 'procesadas', '3101123456', 'lote-1');
    fs.mkdirSync(loteDir, { recursive: true });
    const xmlPath = path.join(loteDir, 'factura.xml');
    const oldManifestPath = path.join(loteDir, 'old.manifest.json');
    const newManifestPath = path.join(loteDir, 'new.manifest.json');
    fs.writeFileSync(xmlPath, '<xml />');
    fs.writeFileSync(oldManifestPath, JSON.stringify({ ingestion_id: 'old' }));
    fs.writeFileSync(newManifestPath, JSON.stringify({ ingestion_id: 'new' }));
    fs.utimesSync(oldManifestPath, new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-01T00:00:00.000Z'));
    fs.utimesSync(newManifestPath, new Date('2026-01-02T00:00:00.000Z'), new Date('2026-01-02T00:00:00.000Z'));
    const resolver = createFacturasManifestResolver({ baseDir: tempRoot });

    const result = resolver.readManifestForDocument({
      rutaXml: path.relative(tempRoot, xmlPath),
      notFoundMessage: 'Manifiesto no encontrado'
    });

    expect(result.manifest).toEqual({ ingestion_id: 'new' });
    expect(toPortablePath(result.manifestPath)).toBe(toPortablePath(newManifestPath));
  });

  test('resuelve manifiesto desde la carpeta del PDF absoluto cuando no hay XML', () => {
    const loteDir = path.join(tempRoot, 'procesadas', '3101123456', 'lote-2');
    fs.mkdirSync(loteDir, { recursive: true });
    const pdfPath = path.join(loteDir, 'factura.pdf');
    const manifestPath = path.join(loteDir, 'lote-2.manifest.json');
    fs.writeFileSync(pdfPath, 'PDF');
    fs.writeFileSync(manifestPath, JSON.stringify({
      ingestion_id: 'lote-2',
      attachments_saved: [{ savedAs: 'factura.pdf' }]
    }));
    const resolver = createFacturasManifestResolver({ baseDir: tempRoot });

    const result = resolver.readManifestForDocument({
      rutaPdf: pdfPath,
      notFoundMessage: 'Manifiesto no encontrado'
    });

    expect(result.manifest.ingestion_id).toBe('lote-2');
    expect(toPortablePath(result.manifestPath)).toBe(toPortablePath(manifestPath));
  });

  test('lanza error 404 con mensaje del consumidor cuando no hay manifiesto', () => {
    const loteDir = path.join(tempRoot, 'procesadas', '3101123456', 'lote-3');
    fs.mkdirSync(loteDir, { recursive: true });
    const xmlPath = path.join(loteDir, 'factura.xml');
    fs.writeFileSync(xmlPath, '<xml />');
    const resolver = createFacturasManifestResolver({ baseDir: tempRoot });

    expect(() => resolver.readManifestForDocument({
      rutaXml: path.relative(tempRoot, xmlPath),
      notFoundMessage: 'No se encontro manifiesto para la factura'
    })).toThrow(expect.objectContaining({
      status: 404,
      message: 'No se encontro manifiesto para la factura'
    }));
  });

  test('lanza error 500 cuando el manifiesto existe pero no es JSON valido', () => {
    const loteDir = path.join(tempRoot, 'procesadas', '3101123456', 'lote-4');
    fs.mkdirSync(loteDir, { recursive: true });
    const xmlPath = path.join(loteDir, 'factura.xml');
    const manifestPath = path.join(loteDir, 'lote-4.manifest.json');
    fs.writeFileSync(xmlPath, '<xml />');
    fs.writeFileSync(manifestPath, '{json-invalido');
    const resolver = createFacturasManifestResolver({ baseDir: tempRoot });

    expect(() => resolver.readManifestForDocument({
      rutaXml: path.relative(tempRoot, xmlPath),
      notFoundMessage: 'Manifiesto no encontrado'
    })).toThrow(expect.objectContaining({
      status: 500,
      message: 'No se pudo leer el manifiesto'
    }));
  });
});
