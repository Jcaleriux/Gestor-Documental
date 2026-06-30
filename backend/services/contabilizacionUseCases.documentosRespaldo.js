const fs = require('fs');
const path = require('path');
const { runtimeConfig } = require('../config/runtime');
const { createError } = require('../utils/errors');
const {
  ACCOUNTING_SUPPORT_DIR_NAME,
  DOCUMENTS_DIR_NAME,
  getRelativePathVariants
} = require('../utils/documentPaths');
const { ensureFacturaSociedadAccess } = require('./contabilizacionUseCases.helpers');

const sanitizeFileName = (value) => {
  const raw = String(value || '').trim();
  const cleaned = raw.replace(/[^0-9A-Za-z._-]/g, '_');
  return cleaned || 'documento_respaldo.pdf';
};

const toPositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const decodePdfBase64 = ({ rawBase64, maxFileBytes, maxFileMb }) => {
  if (!rawBase64 || typeof rawBase64 !== 'string') {
    throw createError(400, 'Archivo PDF requerido');
  }

  const withoutPrefix = rawBase64.replace(/^data:application\/pdf;base64,/i, '');
  let buffer;

  try {
    buffer = Buffer.from(withoutPrefix, 'base64');
  } catch (error) {
    throw createError(400, 'PDF en base64 invalido');
  }

  if (!buffer || buffer.length === 0) {
    throw createError(400, 'PDF vacio');
  }

  if (buffer.length > maxFileBytes) {
    throw createError(400, `El archivo excede el tamano maximo permitido (${maxFileMb} MB).`);
  }

  const signature = buffer.subarray(0, 4).toString('ascii');
  if (signature !== '%PDF') {
    throw createError(400, 'El archivo no es un PDF valido');
  }

  return buffer;
};

const createContabilizacionDocumentosRespaldoUseCases = ({
  contabilizacionRepo,
  runInTransaction,
  baseDir = runtimeConfig.storageBaseDir,
  maxFileMb = runtimeConfig.maxContabilizacionRespaldoMb
}) => {
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const normalizedBaseDir = path.resolve(baseDir);
  const maxFileBytes = maxFileMb * 1024 * 1024;

  const buildStoragePath = ({ sociedadId, facturaId, filename }) => {
    const safeDisplayName = sanitizeFileName(filename);
    const safeBaseName = safeDisplayName.replace(/\.pdf$/i, '') || 'documento_respaldo';
    const relativeDir = path.join(
      DOCUMENTS_DIR_NAME,
      ACCOUNTING_SUPPORT_DIR_NAME,
      String(sociedadId),
      String(facturaId)
    );
    const fullDir = path.join(normalizedBaseDir, relativeDir);

    fs.mkdirSync(fullDir, { recursive: true });

    let candidateFileName = `${Date.now()}_${safeBaseName}.pdf`;
    let fullPath = path.join(fullDir, candidateFileName);
    let sequence = 2;

    while (fs.existsSync(fullPath)) {
      candidateFileName = `${Date.now()}_${safeBaseName}_${sequence}.pdf`;
      fullPath = path.join(fullDir, candidateFileName);
      sequence += 1;
    }

    return {
      nombreArchivo: safeDisplayName.toLowerCase().endsWith('.pdf')
        ? safeDisplayName
        : `${safeDisplayName}.pdf`,
      rutaPdf: path.join(relativeDir, candidateFileName).replace(/\\/g, '/'),
      fullPath
    };
  };

  const resolveDocumentoRespaldoFilePath = (rutaPdf) => {
    if (!rutaPdf) {
      return null;
    }

    const allowedBase = normalizedBaseDir.endsWith(path.sep)
      ? normalizedBaseDir
      : `${normalizedBaseDir}${path.sep}`;
    const variants = getRelativePathVariants(rutaPdf);
    let fallbackPath = null;

    for (const variant of variants) {
      if (variant.includes('..')) {
        continue;
      }

      const absolutePath = path.resolve(normalizedBaseDir, variant);
      if (absolutePath !== normalizedBaseDir && !absolutePath.startsWith(allowedBase)) {
        continue;
      }

      if (!fallbackPath) {
        fallbackPath = absolutePath;
      }

      if (fs.existsSync(absolutePath)) {
        return absolutePath;
      }
    }

    return fallbackPath;
  };

  const uploadDocumentoRespaldo = async ({
    facturaId,
    filename,
    file_base64,
    metadata,
    usuario,
    user
  }) => {
    const pdfBuffer = decodePdfBase64({
      rawBase64: file_base64,
      maxFileBytes,
      maxFileMb
    });
    let fullPath = null;

    try {
      return await runInTransaction(async (client) => {
        const factura = await ensureFacturaSociedadAccess({
          contabilizacionRepo,
          facturaId,
          user,
          client
        });
        const storagePath = buildStoragePath({
          sociedadId: factura.sociedad_id,
          facturaId,
          filename
        });
        fullPath = storagePath.fullPath;

        const documento = await contabilizacionRepo.createDocumentoRespaldo({
          facturaId,
          nombreArchivo: storagePath.nombreArchivo,
          rutaPdf: storagePath.rutaPdf,
          metadata: metadata || null,
          creadoPor: usuario || null
        }, client);

        fs.writeFileSync(storagePath.fullPath, pdfBuffer);

        return documento;
      });
    } catch (error) {
      if (fullPath && fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (unlinkError) {
          console.warn('No se pudo limpiar el archivo de respaldo tras un error:', unlinkError.message);
        }
      }

      throw error;
    }
  };

  const deleteDocumentoRespaldo = async ({ facturaId, documentoId, user }) => {
    const normalizedDocumentoId = toPositiveInt(documentoId, 'documento_id');
    const deleted = await runInTransaction(async (client) => {
      await ensureFacturaSociedadAccess({
        contabilizacionRepo,
        facturaId,
        user,
        client
      });
      const existing = await contabilizacionRepo.getDocumentoRespaldoById({
        facturaId,
        documentoId: normalizedDocumentoId
      }, client);

      if (!existing) {
        throw createError(404, 'Documento de respaldo no encontrado');
      }

      return contabilizacionRepo.deleteDocumentoRespaldoById(normalizedDocumentoId, client);
    });

    const filePath = resolveDocumentoRespaldoFilePath(deleted?.ruta_pdf);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn('No se pudo eliminar el archivo de respaldo:', error.message);
      }
    }

    return {
      id: deleted?.id,
      nombre_archivo: deleted?.nombre_archivo,
      eliminado: true
    };
  };

  return {
    uploadDocumentoRespaldo,
    deleteDocumentoRespaldo
  };
};

module.exports = {
  createContabilizacionDocumentosRespaldoUseCases
};
