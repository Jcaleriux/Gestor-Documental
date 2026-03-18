const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createError } = require('../../utils/errors');

const ALLOWED_UPLOAD_MIME_TYPES = Object.freeze({
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

const ALLOWED_UPLOAD_EXTENSIONS = new Set(Object.values(ALLOWED_UPLOAD_MIME_TYPES));
const DOCUMENT_DIRECTORY_ALIASES = Object.freeze([
  ['reservas_operaciones', 'ventas_operaciones'],
  ['ventas_operaciones', 'reservas_operaciones'],
]);

const parseMaxReservasDocMb = () => {
  const raw = Number(process.env.RESERVAS_DOC_MAX_FILE_MB);
  return Number.isFinite(raw) && raw > 0 ? raw : 15;
};

const MAX_RESERVAS_DOC_MB = parseMaxReservasDocMb();
const MAX_RESERVAS_DOC_BYTES = MAX_RESERVAS_DOC_MB * 1024 * 1024;

const sanitizeFileName = (value, fallback = 'documento') => {
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

  for (const [mimeType, allowedExtension] of Object.entries(ALLOWED_UPLOAD_MIME_TYPES)) {
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

const createReservasDocumentStorage = ({
  baseDir,
  normalizeOptionalText,
  normalizeRequiredText,
  now = () => new Date(),
}) => {
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const normalizedBaseDir = path.resolve(baseDir);

  const decodeUploadFile = ({ fileBase64, fileName, mimeType }) => {
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      throw createError(400, 'file_base64 requerido');
    }

    const normalizedMime = normalizeOptionalText(mimeType)?.toLowerCase() || null;
    const dataUriMatch = fileBase64.match(/^data:([^;]+);base64,/i);
    const mimeFromDataUri = dataUriMatch ? String(dataUriMatch[1]).toLowerCase() : null;

    const finalMime = normalizedMime || mimeFromDataUri || mimeFromFileName(fileName);
    if (!finalMime || !ALLOWED_UPLOAD_MIME_TYPES[finalMime]) {
      throw createError(400, 'Solo se permiten documentos PDF, JPG, PNG o WEBP');
    }

    const rawBase64 = fileBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
    if (!isValidBase64(rawBase64)) {
      throw createError(400, 'file_base64 invalido');
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    if (!buffer || buffer.length === 0) {
      throw createError(400, 'Archivo vacio');
    }

    if (buffer.length > MAX_RESERVAS_DOC_BYTES) {
      throw createError(400, `El archivo excede el tamano maximo permitido (${MAX_RESERVAS_DOC_MB} MB).`);
    }

    const extension = ALLOWED_UPLOAD_MIME_TYPES[finalMime];
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
      throw createError(400, 'Extension de archivo invalida');
    }

    return {
      buffer,
      mimeType: finalMime,
      extension,
    };
  };

  const resolveStoredDocumentPath = (storedPath) => {
    const normalizedStoredPath = path.normalize(normalizeRequiredText(storedPath, 'ruta_archivo'));
    const candidateSet = new Set();
    const addCandidate = (candidatePath) => {
      const normalizedCandidate = path.normalize(candidatePath);
      candidateSet.add(normalizedCandidate);

      for (const [fromSegment, toSegment] of DOCUMENT_DIRECTORY_ALIASES) {
        const fromPattern = `${path.sep}${fromSegment}${path.sep}`;
        const toPattern = `${path.sep}${toSegment}${path.sep}`;

        if (normalizedCandidate.includes(fromPattern)) {
          candidateSet.add(normalizedCandidate.replace(fromPattern, toPattern));
        }
      }
    };

    if (path.isAbsolute(normalizedStoredPath)) {
      addCandidate(normalizedStoredPath);
    } else {
      addCandidate(path.resolve(normalizedBaseDir, normalizedStoredPath));
      addCandidate(path.resolve(normalizedBaseDir, '..', normalizedStoredPath));
      addCandidate(path.resolve(process.cwd(), normalizedStoredPath));
    }

    const existingPath = Array.from(candidateSet).find((candidate) => fs.existsSync(candidate));
    if (!existingPath) {
      throw createError(404, 'Ruta no encontrada');
    }

    return existingPath;
  };

  const writeReplacementDocument = ({
    operationId,
    previousDocument,
    fileBase64,
    fileName,
    mimeType,
    reason,
    metadata,
  }) => {
    const safeFileName = sanitizeFileName(fileName, 'documento');
    const { buffer, mimeType: normalizedMimeType, extension } = decodeUploadFile({
      fileBase64,
      fileName: safeFileName,
      mimeType,
    });
    const timestamp = now();

    const fileDir = path.join(
      normalizedBaseDir,
      'documentos',
      'reservas_operaciones',
      String(operationId),
    );
    fs.mkdirSync(fileDir, { recursive: true });

    const nextFileName = `${previousDocument.codigo_documento}_${timestamp.getTime()}.${extension}`;
    const fullPath = path.join(fileDir, nextFileName);
    fs.writeFileSync(fullPath, buffer);

    const previousMetadata = previousDocument.metadata && typeof previousDocument.metadata === 'object'
      ? previousDocument.metadata
      : {};
    const incomingMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const documentMetadata = {
      ...previousMetadata,
      ...incomingMetadata,
      reemplazo: {
        anterior_nombre_archivo: previousDocument.nombre_archivo,
        anterior_ruta_archivo: previousDocument.ruta_archivo,
        motivo: normalizeOptionalText(reason),
        fecha: timestamp.toISOString(),
      },
    };

    return {
      fullPath,
      hashSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      metadata: documentMetadata,
      mimeType: normalizedMimeType,
      nextFileName,
      tamanioBytes: buffer.length,
    };
  };

  return {
    decodeUploadFile,
    resolveStoredDocumentPath,
    sanitizeFileName,
    writeReplacementDocument,
  };
};

module.exports = {
  createReservasDocumentStorage,
};
