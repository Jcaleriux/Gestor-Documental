const { createError } = require('../utils/errors');
const { ensureSociedadAccess, toPositiveInt } = require('./sociedadAccessService');

const normalizeText = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

const normalizeCode = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return normalized.toUpperCase();
};

const normalizeOptionalInt = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const validateCodigo = (value) => {
  const codigo = normalizeCode(value);
  if (!codigo) {
    throw createError(400, 'codigo requerido');
  }

  if (!/^[0-9A-Z._-]{1,50}$/.test(codigo)) {
    throw createError(400, 'codigo invalido');
  }

  return codigo;
};

const validateNombre = (value) => {
  const nombre = normalizeText(value);
  if (!nombre) {
    throw createError(400, 'nombre requerido');
  }
  return nombre;
};

const normalizeOrden = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createError(400, 'orden invalido');
  }
  return parsed;
};

const buildChildrenMap = (centros = []) => {
  const childrenMap = new Map();
  centros.forEach((centro) => {
    const parentId = centro.centro_padre_id ? String(centro.centro_padre_id) : '';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId).push(String(centro.id));
  });
  return childrenMap;
};

const ensureNoCycle = ({ centros, centroId, centroPadreId }) => {
  if (!centroId || !centroPadreId) {
    return;
  }

  if (String(centroId) === String(centroPadreId)) {
    throw createError(400, 'Un centro no puede ser padre de si mismo');
  }

  const childrenMap = buildChildrenMap(centros);
  const pending = [String(centroId)];
  const descendants = new Set();

  while (pending.length > 0) {
    const current = pending.pop();
    const children = childrenMap.get(current) || [];
    children.forEach((childId) => {
      if (descendants.has(childId)) {
        return;
      }
      descendants.add(childId);
      pending.push(childId);
    });
  }

  if (descendants.has(String(centroPadreId))) {
    throw createError(400, 'El centro padre seleccionado genera una jerarquia circular');
  }
};

const ensureNoCycleByCodeMap = (parentCodeByCode) => {
  const visitState = new Map();

  const visit = (codigo) => {
    const currentState = visitState.get(codigo);
    if (currentState === 'visiting') {
      throw createError(400, `La jerarquia de centros de costo tiene un ciclo en ${codigo}`);
    }
    if (currentState === 'done') {
      return;
    }

    visitState.set(codigo, 'visiting');
    const parentCode = parentCodeByCode.get(codigo);
    if (parentCode) {
      if (!parentCodeByCode.has(parentCode)) {
        throw createError(400, `No se encontro codigo_padre ${parentCode} para ${codigo}`);
      }
      visit(parentCode);
    }
    visitState.set(codigo, 'done');
  };

  Array.from(parentCodeByCode.keys()).forEach(visit);
};

const createCentrosCostoUseCases = ({
  centrosCostoRepo,
  usuariosRepo,
  runInTransaction,
}) => {
  if (!centrosCostoRepo) {
    throw new Error('centrosCostoRepo requerido');
  }
  if (!usuariosRepo) {
    throw new Error('usuariosRepo requerido');
  }
  if (typeof runInTransaction !== 'function') {
    throw new Error('runInTransaction requerido');
  }

  const ensureAprobadorActivo = async (usuarioAprobadorId, client) => {
    const normalizedUsuarioId = toPositiveInt(usuarioAprobadorId, 'usuario_aprobador_id');
    const aprobador = await usuariosRepo.getUsuarioById(normalizedUsuarioId, client);

    if (!aprobador || aprobador.activo === false) {
      throw createError(400, 'usuario_aprobador_id invalido');
    }

    return aprobador;
  };

  const ensureParentInSociedad = async ({ sociedadId, centroPadreId }, client) => {
    if (!centroPadreId) {
      return null;
    }

    const parent = await centrosCostoRepo.getCentroCostoById(centroPadreId, client);
    if (!parent || Number(parent.sociedad_id) !== Number(sociedadId)) {
      throw createError(400, 'centro_padre_id invalido');
    }

    return parent;
  };

  const listCentrosCosto = async ({ user, sociedadId }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    return centrosCostoRepo.listCentrosCostoBySociedad(normalizedSociedadId);
  };

  const createCentroCosto = async ({ user, ...payload }) => {
    const normalizedSociedadId = await ensureSociedadAccess({
      user,
      sociedadId: payload.sociedad_id,
    });

    const codigo = validateCodigo(payload.codigo);
    const nombre = validateNombre(payload.nombre);
    const centroPadreId = normalizeOptionalInt(payload.centro_padre_id);
    const aprobador = await ensureAprobadorActivo(payload.usuario_aprobador_id);
    const existing = await centrosCostoRepo.getCentroCostoBySociedadAndCodigo({
      sociedadId: normalizedSociedadId,
      codigo,
    });

    if (existing) {
      throw createError(409, 'Ya existe un centro de costo con ese codigo');
    }

    await ensureParentInSociedad({
      sociedadId: normalizedSociedadId,
      centroPadreId,
    });

    return centrosCostoRepo.createCentroCosto({
      sociedadId: normalizedSociedadId,
      codigo,
      nombre,
      centroPadreId,
      usuarioAprobadorId: aprobador.id,
      seleccionableEnContabilizacion: payload.seleccionable_en_contabilizacion !== false,
      activo: payload.activo !== false,
      orden: normalizeOrden(payload.orden),
      metadata: payload.metadata || null,
      creadoPor: user?.email || null,
    });
  };

  const updateCentroCosto = async ({ user, id, ...payload }) => {
    const centroId = toPositiveInt(id, 'id');
    const current = await centrosCostoRepo.getCentroCostoById(centroId);

    if (!current) {
      throw createError(404, 'Centro de costo no encontrado');
    }

    const normalizedSociedadId = await ensureSociedadAccess({
      user,
      sociedadId: current.sociedad_id,
    });

    const codigo = validateCodigo(payload.codigo);
    const nombre = validateNombre(payload.nombre);
    const centroPadreId = normalizeOptionalInt(payload.centro_padre_id);
    const aprobador = await ensureAprobadorActivo(payload.usuario_aprobador_id);
    const duplicate = await centrosCostoRepo.getCentroCostoBySociedadAndCodigo({
      sociedadId: normalizedSociedadId,
      codigo,
    });

    if (duplicate && Number(duplicate.id) !== centroId) {
      throw createError(409, 'Ya existe un centro de costo con ese codigo');
    }

    await ensureParentInSociedad({
      sociedadId: normalizedSociedadId,
      centroPadreId,
    });

    const centros = await centrosCostoRepo.listCentrosCostoBySociedad(normalizedSociedadId);
    ensureNoCycle({
      centros,
      centroId,
      centroPadreId,
    });

    return centrosCostoRepo.updateCentroCosto({
      id: centroId,
      codigo,
      nombre,
      centroPadreId,
      usuarioAprobadorId: aprobador.id,
      seleccionableEnContabilizacion: payload.seleccionable_en_contabilizacion !== false,
      activo: payload.activo !== false,
      orden: normalizeOrden(payload.orden),
      metadata: payload.metadata || null,
      creadoPor: user?.email || null,
    });
  };

  const bulkUpsertCentrosCosto = async ({ user, sociedadId, centros = [] }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });

    if (!Array.isArray(centros)) {
      throw createError(400, 'centros invalido');
    }

    return runInTransaction(async (client) => {
      const currentCentros = await centrosCostoRepo.listCentrosCostoBySociedad(normalizedSociedadId, client);
      const currentByCode = new Map(currentCentros.map((centro) => [normalizeCode(centro.codigo), centro]));
      const payloadByCode = new Map();

      for (const rawCentro of centros) {
        const codigo = validateCodigo(rawCentro?.codigo);
        if (payloadByCode.has(codigo)) {
          throw createError(400, `Codigo duplicado en carga masiva: ${codigo}`);
        }

        const existing = currentByCode.get(codigo) || null;
        const aprobador = await ensureAprobadorActivo(rawCentro?.usuario_aprobador_id, client);
        const codigoPadre = normalizeCode(rawCentro?.codigo_padre || rawCentro?.centro_padre_codigo);

        payloadByCode.set(codigo, {
          existing,
          codigo,
          nombre: validateNombre(rawCentro?.nombre),
          codigoPadre: codigoPadre || null,
          usuarioAprobadorId: aprobador.id,
          seleccionableEnContabilizacion: rawCentro?.seleccionable_en_contabilizacion !== false,
          activo: rawCentro?.activo !== false,
          orden: normalizeOrden(rawCentro?.orden),
          metadata: rawCentro?.metadata || existing?.metadata || null,
        });
      }

      const proposedParentByCode = new Map(
        currentCentros.map((centro) => [
          normalizeCode(centro.codigo),
          normalizeCode(centro.centro_padre_codigo) || null,
        ])
      );

      payloadByCode.forEach((item, codigo) => {
        proposedParentByCode.set(codigo, item.codigoPadre || null);
      });

      ensureNoCycleByCodeMap(proposedParentByCode);

      const resolvedByCode = new Map(currentByCode);
      const pendingCodes = new Set(payloadByCode.keys());
      let progress = true;

      while (pendingCodes.size > 0 && progress) {
        progress = false;

        for (const codigo of Array.from(pendingCodes)) {
          const item = payloadByCode.get(codigo);
          const parentCode = item.codigoPadre;

          if (parentCode && parentCode === codigo) {
            throw createError(400, `El centro ${codigo} no puede ser padre de si mismo`);
          }

          if (parentCode && !resolvedByCode.has(parentCode) && !payloadByCode.has(parentCode)) {
            throw createError(400, `No se encontro codigo_padre ${parentCode} para ${codigo}`);
          }

          if (parentCode && payloadByCode.has(parentCode) && pendingCodes.has(parentCode)) {
            continue;
          }

          const parent = parentCode ? resolvedByCode.get(parentCode) : null;
          const saved = await centrosCostoRepo.upsertCentroCostoByCodigo({
            sociedadId: normalizedSociedadId,
            codigo: item.codigo,
            nombre: item.nombre,
            centroPadreId: parent?.id || null,
            usuarioAprobadorId: item.usuarioAprobadorId,
            seleccionableEnContabilizacion: item.seleccionableEnContabilizacion,
            activo: item.activo,
            orden: item.orden,
            metadata: item.metadata,
            creadoPor: user?.email || null,
          }, client);

          resolvedByCode.set(codigo, saved);
          pendingCodes.delete(codigo);
          progress = true;
        }
      }

      if (pendingCodes.size > 0) {
        throw createError(400, 'No se pudo resolver la jerarquia de centros de costo. Revise padres y ciclos.');
      }

      return centrosCostoRepo.listCentrosCostoBySociedad(normalizedSociedadId, client);
    });
  };

  return {
    listCentrosCosto,
    createCentroCosto,
    updateCentroCosto,
    bulkUpsertCentrosCosto,
  };
};

module.exports = { createCentrosCostoUseCases };
