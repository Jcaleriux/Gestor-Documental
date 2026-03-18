const {
  RESERVA_HISTORIAL_ACCIONES,
  RESERVA_OPERACION_ESTADOS,
} = require('../../domain/reservas');

const createReservasDocuments = ({ reservasRepo, shared, documentStorage }) => {
  const {
    normalizeCode,
    normalizeOptionalInteger,
    normalizeOptionalText,
    normalizeRequiredText,
    resolveActor,
    resolveOperacionDocumentoWithAccess,
    resolveOperacionWithAccess,
    resolveSociedadIdByInput,
    runInTransaction,
    toPositiveInt,
    withSchemaGuard,
  } = shared;

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
    const actor = resolveActor({ user, usuario });

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const operation = await resolveOperacionWithAccess({
          user,
          operacionId: id,
          client,
        });

        const document = await reservasRepo.upsertOperacionDocumento(
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

        await reservasRepo.insertOperacionHistorial(
          {
            operacionId: id,
            accion: RESERVA_HISTORIAL_ACCIONES.DOCUMENTO_REGISTRADO,
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

        const refreshedOperation = await reservasRepo.getOperacionById(id, client);
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
    const actor = resolveActor({ user, usuario });

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const sociedadId = await resolveSociedadIdByInput({
          user,
          sociedadId: sociedad_id,
          proyectoCodigo: projectCode,
          client,
        });

        const unit = await reservasRepo.upsertUnidad(
          {
            sociedadId,
            proyectoCodigo: projectCode,
            unidadCodigo: unitCode,
          },
          client,
        );

        let operation = await reservasRepo.findActiveOperacionByUnidadId(unit.id, client);
        let operationCreated = false;

        if (!operation) {
          operation = await reservasRepo.createOperacion(
            {
              unidadId: unit.id,
              clienteNombre: clientName,
              clienteIdentificacion: normalizeOptionalText(cliente_identificacion),
              estado: RESERVA_OPERACION_ESTADOS.ACTIVA,
              creadoPor: actor,
              metadata: metadata || null,
            },
            client,
          );

          operationCreated = true;

          await reservasRepo.insertOperacionHistorial(
            {
              operacionId: operation.id,
              accion: RESERVA_HISTORIAL_ACCIONES.CREADA,
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

        const document = await reservasRepo.upsertOperacionDocumento(
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

        await reservasRepo.insertOperacionHistorial(
          {
            operacionId: operation.id,
            accion: RESERVA_HISTORIAL_ACCIONES.DOCUMENTO_REGISTRADO,
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

        const refreshedOperation = await reservasRepo.getOperacionById(operation.id, client);

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

      const fullPath = documentStorage.resolveStoredDocumentPath(document.ruta_archivo);

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
    const actor = resolveActor({ user, usuario });
    const reason = normalizeOptionalText(motivo);

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const { operation, document: previousDocument } = await resolveOperacionDocumentoWithAccess({
          user,
          operacionId: normalizedOperacionId,
          documentoId: normalizedDocumentoId,
          client,
        });

        const nextDocument = documentStorage.writeReplacementDocument({
          operationId: operation.id,
          previousDocument,
          fileBase64: file_base64,
          fileName: filename,
          mimeType: mime_type,
          reason,
          metadata,
        });

        const updatedDocument = await reservasRepo.upsertOperacionDocumento(
          {
            operacionId: operation.id,
            codigoDocumento: previousDocument.codigo_documento,
            nombreArchivo: nextDocument.nextFileName,
            rutaArchivo: nextDocument.fullPath,
            mimeType: nextDocument.mimeType,
            tamanioBytes: nextDocument.tamanioBytes,
            hashSha256: nextDocument.hashSha256,
            metadata: nextDocument.metadata,
            creadoPor: actor,
          },
          client,
        );

        await reservasRepo.insertOperacionHistorial(
          {
            operacionId: operation.id,
            accion: RESERVA_HISTORIAL_ACCIONES.DOCUMENTO_REEMPLAZADO,
            estadoAnterior: operation.estado,
            estadoNuevo: operation.estado,
            usuario: actor,
            motivo: reason,
            detalles: {
              documento_id: previousDocument.id,
              codigo_documento: previousDocument.codigo_documento,
              anterior_nombre_archivo: previousDocument.nombre_archivo,
              nuevo_nombre_archivo: nextDocument.nextFileName,
            },
          },
          client,
        );

        const refreshedOperation = await reservasRepo.getOperacionById(operation.id, client);

        return {
          operacion: refreshedOperation || operation,
          documento_anterior: previousDocument,
          documento: updatedDocument,
        };
      }),
    );
  };

  return {
    getOperacionDocumentoPreview,
    replaceOperacionDocumento,
    syncOperacionDocumento,
    upsertOperacionDocumento,
  };
};

module.exports = {
  createReservasDocuments,
};
