const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createUserProfileStorage } = require('../services/userProfileStorage');

const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
]);

describe('userProfileStorage', () => {
  test('decodeAvatarFile acepta imagen PNG por data URI', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-user-profile-'));
    const storage = createUserProfileStorage({
      baseDir: tempRoot,
      maxAvatarMb: 1,
    });

    const result = storage.decodeAvatarFile({
      fileBase64: `data:image/png;base64,${pngBuffer.toString('base64')}`,
      fileName: 'perfil.png',
      mimeType: null,
    });

    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.buffer.equals(pngBuffer)).toBe(true);
  });

  test('decodeAvatarFile rechaza contenido que no coincide con el MIME', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-user-profile-'));
    const storage = createUserProfileStorage({
      baseDir: tempRoot,
      maxAvatarMb: 1,
    });

    expect(() => storage.decodeAvatarFile({
      fileBase64: `data:image/png;base64,${Buffer.from('no-es-png').toString('base64')}`,
      fileName: 'perfil.png',
      mimeType: 'image/png',
    })).toThrow('El contenido no coincide con el tipo de imagen');
  });

  test('writeAvatar guarda archivo bajo perfiles y permite resolverlo', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-user-profile-'));
    const fixedDate = new Date('2026-07-02T00:00:00.000Z');
    const storage = createUserProfileStorage({
      baseDir: tempRoot,
      maxAvatarMb: 1,
      now: () => fixedDate,
    });

    const result = storage.writeAvatar({
      userId: 15,
      fileBase64: `data:image/png;base64,${pngBuffer.toString('base64')}`,
      fileName: 'Mi perfil.png',
      mimeType: null,
    });

    expect(result.nombreArchivo).toBe('avatar-1782950400000.png');
    expect(result.rutaArchivo).toBe(path.join('perfiles', 'avatares', '15', 'avatar-1782950400000.png'));
    expect(result.hashSha256).toBe(crypto.createHash('sha256').update(pngBuffer).digest('hex'));
    expect(fs.existsSync(result.fullPath)).toBe(true);
    expect(storage.resolveAvatarPath(result.rutaArchivo)).toBe(result.fullPath);
    expect(storage.removeStoredAvatar(result.rutaArchivo)).toBe(true);
    expect(fs.existsSync(result.fullPath)).toBe(false);
  });

  test('resolveAvatarPath rechaza rutas fuera de perfiles', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-user-profile-'));
    const storage = createUserProfileStorage({
      baseDir: tempRoot,
      maxAvatarMb: 1,
    });

    expect(() => storage.resolveAvatarPath(path.join('documentos', 'factura.pdf')))
      .toThrow('Ruta fuera del directorio permitido');
  });
});
