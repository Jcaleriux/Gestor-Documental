const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { withTransaction } = require('../db/withTransaction');
const { createError } = require('../utils/errors');
const { ensureSociedadAccess, toPositiveInt } = require('./sociedadAccessService');
const {
  VENTA_OPERACION_ESTADOS,
  VENTA_HISTORIAL_ACCIONES,
} = require('../domain/ventas');

const ALLOWED_UPLOAD_MIME_TYPES = Object.freeze({
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

const ALLOWED_UPLOAD_EXTENSIONS = new Set(Object.values(ALLOWED_UPLOAD_MIME_TYPES));

const parseMaxVentasDocMb = () => {
  const raw = Number(process.env.VENTAS_DOC_MAX_FILE_MB);
  return Number.isFinite(raw) && raw > 0 ? raw : 15;
};

const MAX_VENTAS_DOC_MB = parseMaxVentasDocMb();
const MAX_VENTAS_DOC_BYTES = MAX_VENTAS_DOC_MB * 1024 * 1024;

const normalizeCode = (value, fieldName) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    throw createError(400, `${fieldName} requerido`);
  }

  return normalized;
};

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeRequiredText = (value, fieldName) => {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw createError(400, `${fieldName} requerido`);
  }

  return normalized;
};

const normalizeOptionalInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createError(400, `${fieldName} invalido`);
  }

  return parsed;
};

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

  const rawBase64 = fileBase64.replace(/^data:[^;]+;base64,/i, '');
  let buffer;
  try {
    buffer = Buffer.from(rawBase64, 'base64');
  } catch (error) {
    throw createError(400, 'file_base64 invalido');
  }

  if (!buffer || buffer.length === 0) {
    throw createError(400, 'Archivo vacio');
  }

  if (buffer.length > MAX_VENTAS_DOC_BYTES) {
    throw createError(400, `El archivo excede el tamano maximo permitido (${MAX_VENTAS_DOC_MB} MB).`);
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

const withSchemaGuard = async (handler) => {
  try {
    return await handler();
  } catch (error) {
    if (error?.code === '42P01' || error?.code === '42703') {
      throw createError(500, 'Falta la migracion de ventas. Ejecute: npm run db:migrate:ventas');
    }

    throw error;
  }
};

const assertRepoContract = (ventasRepo) => {
  const requiredMethods = [
    'getClient',
    'getSociedadByCodigo',
    'upsertUnidad',
    'findActiveOperacionByUnidadId',
    'getOperacionById',
    'listOperaciones',
    'createOperacion',
    'updateOperacionEstado',
    'insertOperacionHistorial',
    'listOperacionHistorial',
    'listOperacionDocumentos',
    'getOperacionDocumentoById',
    'upsertOperacionDocumento',
  ];

  const missing = requiredMethods.filter((method) => typeof ventasRepo[method] !== 'function');
  if (missing.length > 0) {
    throw new Error(`ventasRepo incompleto: faltan ${missing.join(', ')}`);
  }
};

const createVentasUseCases = ({ ventasRepo, baseDir }) => {
  if (!ventasRepo) {
    throw new Error('ventasRepo requerido');
  }
  assertRepoContract(ventasRepo);
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const normalizedBaseDir = path.resolve(baseDir);
  const runInTransaction = (handler) => withTransaction(() => ventasRepo.getClient(), handler);

  const resolveOperacionWithAccess = async ({ user, operacionId, client }) => {
    const operation = await ventasRepo.getOperacionById(operacionId, client);
    if (!operation) {
      throw createError(404, 'Operacion de venta no encontrada');
    }

    await ensureSociedadAccess({
      user,
      sociedadId: operation.sociedad_id,
    });

    return operation;
  };

  const resolveOperacionDocumentoWithAccess = async ({
    user,
    operacionId,
    documentoId,
    client,
  }) => {
    const operation = await resolveOperacionWithAccess({ user, operacionId, client });
    const document = await ventasRepo.getOperacionDocumentoById(documentoId, client);
    if (!document || Number(document.operacion_id) !== Number(operation.id)) {
      throw createError(404, 'Documento de venta no encontrado');
    }

    return {
      operation,
      document,
    };
  };

  const resolveStoredDocumentPath = (storedPath) => {
    const normalizedStoredPath = normalizeRequiredText(storedPath, 'ruta_archivo');

    const candidates = path.isAbsolute(normalizedStoredPath)
      ? [path.normalize(normalizedStoredPath)]
      : [
          path.resolve(normalizedBaseDir, normalizedStoredPath),
          path.resolve(normalizedBaseDir, '..', normalizedStoredPath),
          path.resolve(process.cwd(), normalizedStoredPath),
        ];

    const existingPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!existingPath) {
      throw createError(404, 'Ruta no encontrada');
    }

    return existingPath;
  };

  const resolveSociedadIdByInput = async ({
    user,
    sociedadId,
    proyectoCodigo,
    client,
  }) => {
    if (sociedadId !== undefined && sociedadId !== null && sociedadId !== '') {
      return ensureSociedadAccess({ user, sociedadId });
    }

    const normalizedProjectCode = normalizeCode(proyectoCodigo, 'proyecto_codigo');
    const sociedad = await ventasRepo.getSociedadByCodigo(normalizedProjectCode, client);

    if (!sociedad || !sociedad.id) {
      throw createError(
        400,
        `No se encontro una sociedad para el proyecto ${normalizedProjectCode}`,
      );
    }

    return ensureSociedadAccess({ user, sociedadId: sociedad.id });
  };

  const listOperaciones = async ({
    user,
    sociedadId,
    estado,
    proyectoCodigo,
    unidadCodigo,
    cliente,
    limit,
  }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    const normalizedEstado = normalizeOptionalText(estado)?.toLowerCase() || null;
    const validStatuses = new Set(Object.values(VENTA_OPERACION_ESTADOS));

    if (normalizedEstado && !validStatuses.has(normalizedEstado)) {
      throw createError(400, 'estado invalido');
    }

    const normalizedLimit = limit == null ? 200 : Math.min(toPositiveInt(limit, 'limit'), 500);

    return withSchemaGuard(() =>
      ventasRepo.listOperaciones({
        sociedadId: normalizedSociedadId,
        estado: normalizedEstado,
        proyectoCodigo: normalizeOptionalText(proyectoCodigo)?.toUpperCase() || null,
        unidadCodigo: normalizeOptionalText(unidadCodigo)?.toUpperCase() || null,
        clienteTexto: normalizeOptionalText(cliente),
        limit: normalizedLimit,
      }),
    );
  };

  const getOperacion = async ({ user, operacionId }) => {
    const id = toPositiveInt(operacionId, 'operacion_id');
    return withSchemaGuard(async () => {
      const operation = await resolveOperacionWithAccess({ user, operacionId: id });
      const [historial, documentos] = await Promise.all([
        ventasRepo.listOperacionHistorial(id),
        ventasRepo.listOperacionDocumentos(id),
      ]);

      return {
        operacion: operation,
        historial,
        documentos,
      };
    });
  };

  const createOperacion = async ({
    user,
    sociedad_id,
    proyecto_codigo,
    unidad_codigo,
    cliente_nombre,
    cliente_identificacion,
    metadata,
    usuario,
  }) => {
    const normalizedSociedadId = await ensureSociedadAccess({
      user,
      sociedadId: sociedad_id,
    });
    const normalizedProyectoCode = normalizeCode(proyecto_codigo, 'proyecto_codigo');
    const normalizedUnidadCode = normalizeCode(unidad_codigo, 'unidad_codigo');
    const normalizedClienteName = normalizeRequiredText(cliente_nombre, 'cliente_nombre');
    const actor = normalizeOptionalText(usuario) || user?.email || user?.nombre || null;

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const unit = await ventasRepo.upsertUnidad(
          {
            sociedadId: normalizedSociedadId,
            proyectoCodigo: normalizedProyectoCode,
            unidadCodigo: normalizedUnidadCode,
          },
          client,
        );

        const activeOperation = await ventasRepo.findActiveOperacionByUnidadId(unit.id, client);
        if (activeOperation) {
          throw createError(409, 'La unidad ya tiene una operacion activa');
        }

        const operation = await ventasRepo.createOperacion(
          {
            unidadId: unit.id,
            clienteNombre: normalizedClienteName,
            clienteIdentificacion: normalizeOptionalText(cliente_identificacion),
            estado: VENTA_OPERACION_ESTADOS.ACTIVA,
            creadoPor: actor,
            metadata: metadata || null,
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: operation.id,
            accion: VENTA_HISTORIAL_ACCIONES.CREADA,
            estadoAnterior: null,
            estadoNuevo: operation.estado,
            usuario: actor,
            motivo: null,
            detalles: null,
          },
          client,
        );

        return operation;
      }),
    );
  };

  const cancelOperacion = async ({ user, operacionId, motivo, usuario }) => {
    const id = toPositiveInt(operacionId, 'operacion_id');
    const actor = normalizeOptionalText(usuario) || user?.email || user?.nombre || null;
    const reason = normalizeOptionalText(motivo);

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const current = await resolveOperacionWithAccess({
          user,
          operacionId: id,
          client,
        });

        if (current.estado !== VENTA_OPERACION_ESTADOS.ACTIVA) {
          throw createError(409, 'Solo una operacion activa puede cancelarse');
        }

        const updated = await ventasRepo.updateOperacionEstado(
          {
            id,
            estado: VENTA_OPERACION_ESTADOS.CANCELADA,
            motivo: reason,
            cerradoEn: new Date().toISOString(),
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: id,
            accion: VENTA_HISTORIAL_ACCIONES.CANCELADA,
            estadoAnterior: current.estado,
            estadoNuevo: updated.estado,
            usuario: actor,
            motivo: reason,
            detalles: null,
          },
          client,
        );

        return updated;
      }),
    );
  };

  const closeOperacion = async ({ user, operacionId, motivo, usuario }) => {
    const id = toPositiveInt(operacionId, 'operacion_id');
    const actor = normalizeOptionalText(usuario) || user?.email || user?.nombre || null;
    const reason = normalizeOptionalText(motivo);

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const current = await resolveOperacionWithAccess({
          user,
          operacionId: id,
          client,
        });

        if (current.estado !== VENTA_OPERACION_ESTADOS.ACTIVA) {
          throw createError(409, 'Solo una operacion activa puede cerrarse');
        }

        const updated = await ventasRepo.updateOperacionEstado(
          {
            id,
            estado: VENTA_OPERACION_ESTADOS.CERRADA,
            motivo: reason,
            cerradoEn: new Date().toISOString(),
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: id,
            accion: VENTA_HISTORIAL_ACCIONES.CERRADA,
            estadoAnterior: current.estado,
            estadoNuevo: updated.estado,
            usuario: actor,
            motivo: reason,
            detalles: null,
          },
          client,
        );

        return updated;
      }),
    );
  };

  const transferOperacion = async ({
    user,
    operacionId,
    destino_sociedad_id,
    destino_proyecto_codigo,
    destino_unidad_codigo,
    cliente_nombre,
    cliente_identificacion,
    motivo,
    usuario,
    metadata,
  }) => {
    const id = toPositiveInt(operacionId, 'operacion_id');
    const targetProjectCode = normalizeCode(destino_proyecto_codigo, 'destino_proyecto_codigo');
    const targetUnitCode = normalizeCode(destino_unidad_codigo, 'destino_unidad_codigo');
    const actor = normalizeOptionalText(usuario) || user?.email || user?.nombre || null;
    const reason = normalizeOptionalText(motivo);

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const source = await resolveOperacionWithAccess({
          user,
          operacionId: id,
          client,
        });

        if (source.estado !== VENTA_OPERACION_ESTADOS.ACTIVA) {
          throw createError(409, 'Solo una operacion activa puede trasladarse');
        }

        const targetSociedadId = destino_sociedad_id
          ? await ensureSociedadAccess({ user, sociedadId: destino_sociedad_id })
          : await ensureSociedadAccess({ user, sociedadId: source.sociedad_id });

        if (
          Number(targetSociedadId) === Number(source.sociedad_id)
          && targetProjectCode === source.proyecto_codigo
          && targetUnitCode === source.unidad_codigo
        ) {
          throw createError(400, 'El destino debe ser diferente a la unidad origen');
        }

        const targetUnit = await ventasRepo.upsertUnidad(
          {
            sociedadId: targetSociedadId,
            proyectoCodigo: targetProjectCode,
            unidadCodigo: targetUnitCode,
          },
          client,
        );

        const existingTargetActive = await ventasRepo.findActiveOperacionByUnidadId(targetUnit.id, client);
        if (existingTargetActive) {
          throw createError(409, 'La unidad destino ya tiene una operacion activa');
        }

        const sourceUpdated = await ventasRepo.updateOperacionEstado(
          {
            id: source.id,
            estado: VENTA_OPERACION_ESTADOS.TRASLADADA,
            motivo: reason,
            cerradoEn: new Date().toISOString(),
          },
          client,
        );

        const targetOperation = await ventasRepo.createOperacion(
          {
            unidadId: targetUnit.id,
            clienteNombre: normalizeOptionalText(cliente_nombre) || source.cliente_nombre,
            clienteIdentificacion:
              normalizeOptionalText(cliente_identificacion) || source.cliente_identificacion,
            estado: VENTA_OPERACION_ESTADOS.ACTIVA,
            origenOperacionId: source.id,
            motivo: reason,
            creadoPor: actor,
            metadata: metadata || source.metadata || null,
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: source.id,
            accion: VENTA_HISTORIAL_ACCIONES.TRASLADO_SALIDA,
            estadoAnterior: source.estado,
            estadoNuevo: sourceUpdated.estado,
            usuario: actor,
            motivo: reason,
            detalles: {
              destino_operacion_id: targetOperation.id,
              destino_sociedad_id: targetSociedadId,
              destino_proyecto_codigo: targetProjectCode,
              destino_unidad_codigo: targetUnitCode,
            },
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: targetOperation.id,
            accion: VENTA_HISTORIAL_ACCIONES.TRASLADO_ENTRADA,
            estadoAnterior: null,
            estadoNuevo: targetOperation.estado,
            usuario: actor,
            motivo: reason,
            detalles: {
              origen_operacion_id: source.id,
              origen_sociedad_id: source.sociedad_id,
              origen_proyecto_codigo: source.proyecto_codigo,
              origen_unidad_codigo: source.unidad_codigo,
            },
          },
          client,
        );

        return {
          origen: sourceUpdated,
          destino: targetOperation,
        };
      }),
    );
  };

  const upsertOperacionDocumento = async ({
    user,
    operacionId,
    codigo_documento,
    nombre_archivo,
    ruta_archivo,
    mime_type,
    tamanio_bytes,
    hash_sha256,
    metadata,
    usuario,
  }) => {
    const id = toPositiveInt(operacionId, 'operacion_id');
    const documentCode = normalizeCode(codigo_documento, 'codigo_documento');
    const fileName = normalizeRequiredText(nombre_archivo, 'nombre_archivo');
    const filePath = normalizeRequiredText(ruta_archivo, 'ruta_archivo');
    const actor = normalizeOptionalText(usuario) || user?.email || user?.nombre || null;

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const operation = await resolveOperacionWithAccess({
          user,
          operacionId: id,
          client,
        });

        const document = await ventasRepo.upsertOperacionDocumento(
          {
            operacionId: id,
            codigoDocumento: documentCode,
            nombreArchivo: fileName,
            rutaArchivo: filePath,
            mimeType: normalizeOptionalText(mime_type),
            tamanioBytes: normalizeOptionalInteger(tamanio_bytes, 'tamanio_bytes'),
            hashSha256: normalizeOptionalText(hash_sha256),
            metadata: metadata || null,
            creadoPor: actor,
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: id,
            accion: VENTA_HISTORIAL_ACCIONES.DOCUMENTO_REGISTRADO,
            estadoAnterior: operation.estado,
            estadoNuevo: operation.estado,
            usuario: actor,
            motivo: null,
            detalles: {
              codigo_documento: documentCode,
              nombre_archivo: fileName,
            },
          },
          client,
        );

        const refreshedOperation = await ventasRepo.getOperacionById(id, client);
        return {
          operacion: refreshedOperation || operation,
          documento: document,
        };
      }),
    );
  };

  const syncOperacionDocumento = async ({
    user,
    sociedad_id,
    proyecto_codigo,
    unidad_codigo,
    cliente_nombre,
    cliente_identificacion,
    codigo_documento,
    nombre_archivo,
    ruta_archivo,
    mime_type,
    tamanio_bytes,
    hash_sha256,
    metadata,
    usuario,
  }) => {
    const projectCode = normalizeCode(proyecto_codigo, 'proyecto_codigo');
    const unitCode = normalizeCode(unidad_codigo, 'unidad_codigo');
    const documentCode = normalizeCode(codigo_documento, 'codigo_documento');
    const fileName = normalizeRequiredText(nombre_archivo, 'nombre_archivo');
    const filePath = normalizeRequiredText(ruta_archivo, 'ruta_archivo');
    const clientName = normalizeRequiredText(cliente_nombre, 'cliente_nombre');
    const actor = normalizeOptionalText(usuario) || user?.email || user?.nombre || null;

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const sociedadId = await resolveSociedadIdByInput({
          user,
          sociedadId: sociedad_id,
          proyectoCodigo: projectCode,
          client,
        });

        const unit = await ventasRepo.upsertUnidad(
          {
            sociedadId,
            proyectoCodigo: projectCode,
            unidadCodigo: unitCode,
          },
          client,
        );

        let operation = await ventasRepo.findActiveOperacionByUnidadId(unit.id, client);
        let operationCreated = false;

        if (!operation) {
          operation = await ventasRepo.createOperacion(
            {
              unidadId: unit.id,
              clienteNombre: clientName,
              clienteIdentificacion: normalizeOptionalText(cliente_identificacion),
              estado: VENTA_OPERACION_ESTADOS.ACTIVA,
              creadoPor: actor,
              metadata: metadata || null,
            },
            client,
          );

          operationCreated = true;

          await ventasRepo.insertOperacionHistorial(
            {
              operacionId: operation.id,
              accion: VENTA_HISTORIAL_ACCIONES.CREADA,
              estadoAnterior: null,
              estadoNuevo: operation.estado,
              usuario: actor,
              motivo: null,
              detalles: {
                origen: 'chatbot_sync',
              },
            },
            client,
          );
        }

        const document = await ventasRepo.upsertOperacionDocumento(
          {
            operacionId: operation.id,
            codigoDocumento: documentCode,
            nombreArchivo: fileName,
            rutaArchivo: filePath,
            mimeType: normalizeOptionalText(mime_type),
            tamanioBytes: normalizeOptionalInteger(tamanio_bytes, 'tamanio_bytes'),
            hashSha256: normalizeOptionalText(hash_sha256),
            metadata: metadata || null,
            creadoPor: actor,
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: operation.id,
            accion: VENTA_HISTORIAL_ACCIONES.DOCUMENTO_REGISTRADO,
            estadoAnterior: operation.estado,
            estadoNuevo: operation.estado,
            usuario: actor,
            motivo: null,
            detalles: {
              codigo_documento: documentCode,
              nombre_archivo: fileName,
              origen: 'chatbot_sync',
            },
          },
          client,
        );

        const refreshedOperation = await ventasRepo.getOperacionById(operation.id, client);

        return {
          operacion: refreshedOperation || operation,
          documento: document,
          operacion_creada: operationCreated,
        };
      }),
    );
  };

  const getOperacionDocumentoPreview = async ({
    user,
    operacionId,
    documentoId,
  }) => {
    const normalizedOperacionId = toPositiveInt(operacionId, 'operacion_id');
    const normalizedDocumentoId = toPositiveInt(documentoId, 'documento_id');

    return withSchemaGuard(async () => {
      const { operation, document } = await resolveOperacionDocumentoWithAccess({
        user,
        operacionId: normalizedOperacionId,
        documentoId: normalizedDocumentoId,
      });

      const fullPath = resolveStoredDocumentPath(document.ruta_archivo);

      return {
        operacion: operation,
        documento: document,
        fullPath,
      };
    });
  };

  const replaceOperacionDocumento = async ({
    user,
    operacionId,
    documentoId,
    filename,
    file_base64,
    mime_type,
    motivo,
    metadata,
    usuario,
  }) => {
    const normalizedOperacionId = toPositiveInt(operacionId, 'operacion_id');
    const normalizedDocumentoId = toPositiveInt(documentoId, 'documento_id');
    const safeFileName = sanitizeFileName(filename, 'documento');
    const reason = normalizeOptionalText(motivo);
    const actor = normalizeOptionalText(usuario) || user?.email || user?.nombre || null;

    const { buffer, mimeType, extension } = decodeUploadFile({
      fileBase64: file_base64,
      fileName: safeFileName,
      mimeType: mime_type,
    });

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const { operation, document: previousDocument } = await resolveOperacionDocumentoWithAccess({
          user,
          operacionId: normalizedOperacionId,
          documentoId: normalizedDocumentoId,
          client,
        });

        const fileDir = path.join(
          normalizedBaseDir,
          'documentos',
          'ventas_operaciones',
          String(operation.id),
        );
        fs.mkdirSync(fileDir, { recursive: true });

        const nextFileName = `${previousDocument.codigo_documento}_${Date.now()}.${extension}`;
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
            motivo: reason,
            fecha: new Date().toISOString(),
          },
        };

        const updatedDocument = await ventasRepo.upsertOperacionDocumento(
          {
            operacionId: operation.id,
            codigoDocumento: previousDocument.codigo_documento,
            nombreArchivo: nextFileName,
            rutaArchivo: fullPath,
            mimeType,
            tamanioBytes: buffer.length,
            hashSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
            metadata: documentMetadata,
            creadoPor: actor,
          },
          client,
        );

        await ventasRepo.insertOperacionHistorial(
          {
            operacionId: operation.id,
            accion: VENTA_HISTORIAL_ACCIONES.DOCUMENTO_REEMPLAZADO,
            estadoAnterior: operation.estado,
            estadoNuevo: operation.estado,
            usuario: actor,
            motivo: reason,
            detalles: {
              documento_id: previousDocument.id,
              codigo_documento: previousDocument.codigo_documento,
              anterior_nombre_archivo: previousDocument.nombre_archivo,
              nuevo_nombre_archivo: nextFileName,
            },
          },
          client,
        );

        const refreshedOperation = await ventasRepo.getOperacionById(operation.id, client);

        return {
          operacion: refreshedOperation || operation,
          documento_anterior: previousDocument,
          documento: updatedDocument,
        };
      }),
    );
  };

  return {
    listOperaciones,
    getOperacion,
    createOperacion,
    cancelOperacion,
    closeOperacion,
    transferOperacion,
    upsertOperacionDocumento,
    syncOperacionDocumento,
    getOperacionDocumentoPreview,
    replaceOperacionDocumento,
  };
};

module.exports = {
  createVentasUseCases,
};
