const {
  RESERVA_HISTORIAL_ACCIONES,
  RESERVA_OPERACION_ESTADOS,
} = require('../../domain/reservas');

const VALID_RESERVA_ESTADOS = new Set(Object.values(RESERVA_OPERACION_ESTADOS));

const createReservasOperations = ({ reservasRepo, shared }) => {
  const {
    createError,
    ensureSociedadAccess,
    normalizeCode,
    normalizeOptionalText,
    normalizeRequiredText,
    resolveActor,
    resolveOperacionWithAccess,
    runInTransaction,
    toPositiveInt,
    withSchemaGuard,
  } = shared;

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

    if (normalizedEstado && !VALID_RESERVA_ESTADOS.has(normalizedEstado)) {
      throw createError(400, 'estado invalido');
    }

    const normalizedLimit = limit == null ? 200 : Math.min(toPositiveInt(limit, 'limit'), 500);

    return withSchemaGuard(() =>
      reservasRepo.listOperaciones({
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
        reservasRepo.listOperacionHistorial(id),
        reservasRepo.listOperacionDocumentos(id),
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
    const actor = resolveActor({ user, usuario });

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const unit = await reservasRepo.upsertUnidad(
          {
            sociedadId: normalizedSociedadId,
            proyectoCodigo: normalizedProyectoCode,
            unidadCodigo: normalizedUnidadCode,
          },
          client,
        );

        const activeOperation = await reservasRepo.findActiveOperacionByUnidadId(unit.id, client);
        if (activeOperation) {
          throw createError(409, 'La unidad ya tiene una reserva activa');
        }

        const operation = await reservasRepo.createOperacion(
          {
            unidadId: unit.id,
            clienteNombre: normalizedClienteName,
            clienteIdentificacion: normalizeOptionalText(cliente_identificacion),
            estado: RESERVA_OPERACION_ESTADOS.ACTIVA,
            creadoPor: actor,
            metadata: metadata || null,
          },
          client,
        );

        await reservasRepo.insertOperacionHistorial(
          {
            operacionId: operation.id,
            accion: RESERVA_HISTORIAL_ACCIONES.CREADA,
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

  const updateOperacionEstado = async ({
    user,
    operacionId,
    motivo,
    usuario,
    targetEstado,
    historialAccion,
    conflictMessage,
  }) => {
    const id = toPositiveInt(operacionId, 'operacion_id');
    const actor = resolveActor({ user, usuario });
    const reason = normalizeOptionalText(motivo);

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const current = await resolveOperacionWithAccess({
          user,
          operacionId: id,
          client,
        });

        if (current.estado !== RESERVA_OPERACION_ESTADOS.ACTIVA) {
          throw createError(409, conflictMessage);
        }

        const updated = await reservasRepo.updateOperacionEstado(
          {
            id,
            estado: targetEstado,
            motivo: reason,
            cerradoEn: new Date().toISOString(),
          },
          client,
        );

        await reservasRepo.insertOperacionHistorial(
          {
            operacionId: id,
            accion: historialAccion,
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

  const cancelOperacion = async ({ user, operacionId, motivo, usuario }) => updateOperacionEstado({
    user,
    operacionId,
    motivo,
    usuario,
    targetEstado: RESERVA_OPERACION_ESTADOS.CANCELADA,
    historialAccion: RESERVA_HISTORIAL_ACCIONES.CANCELADA,
    conflictMessage: 'Solo una reserva activa puede cancelarse',
  });

  const closeOperacion = async ({ user, operacionId, motivo, usuario }) => updateOperacionEstado({
    user,
    operacionId,
    motivo,
    usuario,
    targetEstado: RESERVA_OPERACION_ESTADOS.CERRADA,
    historialAccion: RESERVA_HISTORIAL_ACCIONES.CERRADA,
    conflictMessage: 'Solo una reserva activa puede cerrarse',
  });

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
    const actor = resolveActor({ user, usuario });
    const reason = normalizeOptionalText(motivo);

    return withSchemaGuard(() =>
      runInTransaction(async (client) => {
        const source = await resolveOperacionWithAccess({
          user,
          operacionId: id,
          client,
        });

        if (source.estado !== RESERVA_OPERACION_ESTADOS.ACTIVA) {
          throw createError(409, 'Solo una reserva activa puede trasladarse');
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

        const targetUnit = await reservasRepo.upsertUnidad(
          {
            sociedadId: targetSociedadId,
            proyectoCodigo: targetProjectCode,
            unidadCodigo: targetUnitCode,
          },
          client,
        );

        const existingTargetActive = await reservasRepo.findActiveOperacionByUnidadId(targetUnit.id, client);
        if (existingTargetActive) {
          throw createError(409, 'La unidad destino ya tiene una reserva activa');
        }

        const sourceUpdated = await reservasRepo.updateOperacionEstado(
          {
            id: source.id,
            estado: RESERVA_OPERACION_ESTADOS.TRASLADADA,
            motivo: reason,
            cerradoEn: new Date().toISOString(),
          },
          client,
        );

        const targetOperation = await reservasRepo.createOperacion(
          {
            unidadId: targetUnit.id,
            clienteNombre: normalizeOptionalText(cliente_nombre) || source.cliente_nombre,
            clienteIdentificacion:
              normalizeOptionalText(cliente_identificacion) || source.cliente_identificacion,
            estado: RESERVA_OPERACION_ESTADOS.ACTIVA,
            origenOperacionId: source.id,
            motivo: reason,
            creadoPor: actor,
            metadata: metadata || source.metadata || null,
          },
          client,
        );

        await reservasRepo.insertOperacionHistorial(
          {
            operacionId: source.id,
            accion: RESERVA_HISTORIAL_ACCIONES.TRASLADO_SALIDA,
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

        await reservasRepo.insertOperacionHistorial(
          {
            operacionId: targetOperation.id,
            accion: RESERVA_HISTORIAL_ACCIONES.TRASLADO_ENTRADA,
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

  return {
    cancelOperacion,
    closeOperacion,
    createOperacion,
    getOperacion,
    listOperaciones,
    transferOperacion,
  };
};

module.exports = {
  createReservasOperations,
};
