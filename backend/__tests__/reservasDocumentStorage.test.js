const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createReservasDocumentStorage } = require('../services/reservas/documentStorage');
const {
  normalizeOptionalText,
  normalizeRequiredText,
} = require('../services/reservas/shared');

const createStorage = (baseDir, options = {}) => createReservasDocumentStorage({
  baseDir,
  normalizeOptionalText,
  normalizeRequiredText,
  ...options,
});

describe('reservas documentStorage', () => {
  test('decodeUploadFile acepta PDF por data URI', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'SendaDocs-reservas-storage-'));
    const storage = createStorage(tempRoot);

    const result = storage.decodeUploadFile({
      fileBase64: `data:application/pdf;base64,${Buffer.from('pdf-qa').toString('base64')}`,
      fileName: 'reserva.pdf',
      mimeType: null,
    });

    expect(result.mimeType).toBe('application/pdf');
    expect(result.extension).toBe('pdf');
    expect(result.buffer.equals(Buffer.from('pdf-qa'))).toBe(true);
  });

  test('decodeUploadFile rechaza base64 invalido', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'SendaDocs-reservas-storage-'));
    const storage = createStorage(tempRoot);

    expect(() => storage.decodeUploadFile({
      fileBase64: 'esto-no-es-base64',
      fileName: 'reserva.pdf',
      mimeType: 'application/pdf',
    })).toThrow('file_base64 invalido');
  });

  test('resolveStoredDocumentPath resuelve alias historicos entre reservas y ventas', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'SendaDocs-reservas-storage-'));
    const realDir = path.join(tempRoot, 'documentos', 'ventas_operaciones', '100');
    fs.mkdirSync(realDir, { recursive: true });
    const realFile = path.join(realDir, 'reserva.pdf');
    fs.writeFileSync(realFile, 'pdf');

    const storage = createStorage(tempRoot);
    const aliasPath = realFile.replace('ventas_operaciones', 'reservas_operaciones');

    const resolved = storage.resolveStoredDocumentPath(aliasPath);

    expect(resolved).toBe(realFile);
  });

  test('writeReplacementDocument guarda archivo, hash y metadata de reemplazo', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'SendaDocs-reservas-storage-'));
    const fixedDate = new Date('2024-01-01T00:00:00.000Z');
    const storage = createStorage(tempRoot, {
      now: () => fixedDate,
    });

    const previousDocument = {
      codigo_documento: 'PAGO_RESERVA',
      nombre_archivo: 'anterior.pdf',
      ruta_archivo: 'documentos/reservas_operaciones/55/anterior.pdf',
      metadata: { previo: 'ok' },
    };
    const nextFileContent = Buffer.from('reemplazo-reserva');

    const result = storage.writeReplacementDocument({
      operationId: 55,
      previousDocument,
      fileBase64: `data:application/pdf;base64,${nextFileContent.toString('base64')}`,
      fileName: 'Nuevo final!!.pdf',
      mimeType: null,
      reason: 'QA',
      metadata: { origen: 'tests' },
    });

    expect(result.nextFileName).toBe('PAGO_RESERVA_1704067200000.pdf');
    expect(fs.existsSync(result.fullPath)).toBe(true);
    expect(result.tamanioBytes).toBe(nextFileContent.length);
    expect(result.hashSha256).toBe(crypto.createHash('sha256').update(nextFileContent).digest('hex'));
    expect(result.metadata).toMatchObject({
      previo: 'ok',
      origen: 'tests',
      reemplazo: {
        anterior_nombre_archivo: 'anterior.pdf',
        anterior_ruta_archivo: 'documentos/reservas_operaciones/55/anterior.pdf',
        motivo: 'QA',
        fecha: '2024-01-01T00:00:00.000Z',
      },
    });
  });
});
