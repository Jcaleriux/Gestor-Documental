const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createError } = require('../utils/errors');
const { runtimeConfig } = require('../config/runtime');

const ALLOWED_AVATAR_MIME_TYPES = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

const MAX_PROFILE_AVATAR_MB = runtimeConfig.maxProfileAvatarMb;
const MAX_PROFILE_AVATAR_BYTES = MAX_PROFILE_AVATAR_MB * 1024 * 1024;

const sanitizeFileName = (value, fallback = 'avatar') => {
  const raw = String(value || '').trim();
  const cleaned = raw.replace(/[^0-9A-Za-z._-]/g, '_');
  return cleaned || fallback;
};

const mimeFromFileName = (fileName) => {
  const extension = path.extname(String(fileName || ''))
    .replace('.', '')
    .toLowerCase();

  if (!extension) {
    return null;
  }

  for (const [mimeType, allowedExtension] of Object.entries(ALLOWED_AVATAR_MIME_TYPES)) {
    if (allowedExtension === extension) {
      return mimeType;
    }
  }

  return null;
};

const isValidBase64 = (value) => (
  typeof value === 'string'
  && value.length > 0
  && value.length % 4 === 0
  && /^[A-Za-z0-9+/]*={0,2}$/.test(value)
);

const hasExpectedImageSignature = (buffer, mimeType) => {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.length >= 8
      && buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4e
      && buffer[3] === 0x47
      && buffer[4] === 0x0d
      && buffer[5] === 0x0a
      && buffer[6] === 0x1a
      && buffer[7] === 0x0a;
  }

  if (mimeType === 'image/webp') {
    return buffer.length >= 12
      && buffer.toString('ascii', 0, 4) === 'RIFF'
      && buffer.toString('ascii', 8, 12) === 'WEBP';
  }

  return false;
};

const createUserProfileStorage = ({
  baseDir,
  maxAvatarMb = MAX_PROFILE_AVATAR_MB,
  now = () => new Date(),
} = {}) => {
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const normalizedBaseDir = path.resolve(baseDir);
  const avatarRootDir = path.resolve(normalizedBaseDir, 'perfiles', 'avatares');
  const maxAvatarBytes = maxAvatarMb * 1024 * 1024;

  const isInsideAvatarRoot = (candidatePath) => {
    const resolvedCandidate = path.resolve(candidatePath);
    return resolvedCandidate === avatarRootDir
      || resolvedCandidate.startsWith(`${avatarRootDir}${path.sep}`);
  };

  const decodeAvatarFile = ({ fileBase64, fileName, mimeType }) => {
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      throw createError(400, 'file_base64 requerido');
    }

    const normalizedMime = String(mimeType || '').trim().toLowerCase() || null;
    const dataUriMatch = fileBase64.match(/^data:([^;]+);base64,/i);
    const mimeFromDataUri = dataUriMatch ? String(dataUriMatch[1]).toLowerCase() : null;
    const finalMime = normalizedMime || mimeFromDataUri || mimeFromFileName(fileName);

    if (!finalMime || !ALLOWED_AVATAR_MIME_TYPES[finalMime]) {
      throw createError(400, 'Solo se permiten imagenes JPG, PNG o WEBP');
    }

    const rawBase64 = fileBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
    if (!isValidBase64(rawBase64)) {
      throw createError(400, 'file_base64 invalido');
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    if (!buffer || buffer.length === 0) {
      throw createError(400, 'Archivo vacio');
    }

    if (buffer.length > maxAvatarBytes) {
      throw createError(400, `La imagen excede el tamano maximo permitido (${maxAvatarMb} MB).`);
    }

    if (!hasExpectedImageSignature(buffer, finalMime)) {
      throw createError(400, 'El contenido no coincide con el tipo de imagen');
    }

    return {
      buffer,
      extension: ALLOWED_AVATAR_MIME_TYPES[finalMime],
      mimeType: finalMime,
    };
  };

  const writeAvatar = ({ userId, fileBase64, fileName, mimeType }) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      throw createError(400, 'usuario_id invalido');
    }

    const safeFileName = sanitizeFileName(fileName, 'avatar');
    const { buffer, extension, mimeType: normalizedMimeType } = decodeAvatarFile({
      fileBase64,
      fileName: safeFileName,
      mimeType,
    });
    const timestamp = now();
    const userAvatarDir = path.join(avatarRootDir, normalizedUserId);
    fs.mkdirSync(userAvatarDir, { recursive: true });

    const nombreArchivo = `avatar-${timestamp.getTime()}.${extension}`;
    const fullPath = path.join(userAvatarDir, nombreArchivo);
    fs.writeFileSync(fullPath, buffer);

    return {
      fullPath,
      hashSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      mimeType: normalizedMimeType,
      nombreArchivo,
      rutaArchivo: path.join('perfiles', 'avatares', normalizedUserId, nombreArchivo),
      tamanioBytes: buffer.length,
    };
  };

  const resolveAvatarPath = (storedPath) => {
    const normalizedStoredPath = path.normalize(String(storedPath || '').trim());
    if (!normalizedStoredPath) {
      throw createError(404, 'Avatar no encontrado');
    }

    const fullPath = path.isAbsolute(normalizedStoredPath)
      ? path.resolve(normalizedStoredPath)
      : path.resolve(normalizedBaseDir, normalizedStoredPath);

    if (!isInsideAvatarRoot(fullPath)) {
      throw createError(400, 'Ruta fuera del directorio permitido');
    }

    if (!fs.existsSync(fullPath)) {
      throw createError(404, 'Avatar no encontrado');
    }

    return fullPath;
  };

  const removeStoredAvatar = (storedPath) => {
    try {
      const fullPath = resolveAvatarPath(storedPath);
      fs.unlinkSync(fullPath);
      return true;
    } catch {
      return false;
    }
  };

  return {
    decodeAvatarFile,
    removeStoredAvatar,
    resolveAvatarPath,
    sanitizeFileName,
    writeAvatar,
  };
};

module.exports = {
  ALLOWED_AVATAR_MIME_TYPES,
  createUserProfileStorage,
  hasExpectedImageSignature,
};
