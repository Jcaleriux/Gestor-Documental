const { createError } = require('../utils/errors');
const { normalizarIdentificacion } = require('./proveedor.service');
const { ensureSociedadAccess, toPositiveInt } = require('./sociedadAccessService');

const normalizeText = (value) => {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

const normalizeEmail = (value) => {
  const text = normalizeText(value);
  return text ? text.toLowerCase() : null;
};

const createProveedoresUseCases = ({ proveedoresRepo }) => {
  if (!proveedoresRepo) {
    throw new Error('proveedoresRepo requerido');
  }

  const listProveedores = async ({ user, sociedadId }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    return proveedoresRepo.listProveedoresBySociedad(normalizedSociedadId);
  };

  const listProveedorHistorial = async ({ user, id }) => {
    const proveedorId = toPositiveInt(id, 'id');
    const proveedor = await proveedoresRepo.getProveedorById(proveedorId);
    if (!proveedor) {
      throw createError(404, 'Proveedor no encontrado');
    }

    await ensureSociedadAccess({ user, sociedadId: proveedor.sociedad_id });
    return proveedoresRepo.listProveedorHistorialCambios({ proveedorId });
  };

  const normalizeProveedorInput = (payload) => {
    const identificacionTipo = normalizeText(payload.identificacion_tipo);
    const identificacionNumero = normalizeText(payload.identificacion_numero);
    const identificacionNumeroNormalizado = normalizarIdentificacion(identificacionNumero);

    if (!identificacionNumeroNormalizado) {
      throw createError(400, 'identificacion_numero invalido');
    }

    const nombre = normalizeText(payload.nombre);
    if (!nombre) {
      throw createError(400, 'nombre requerido');
    }

    return {
      identificacionTipo,
      identificacionNumero,
      identificacionNumeroNormalizado,
      nombre,
      nombreComercial: normalizeText(payload.nombre_comercial),
      correoElectronico: normalizeEmail(payload.correo_electronico),
      telefonoCodigoPais: normalizeText(payload.telefono_codigo_pais),
      telefonoNumero: normalizeText(payload.telefono_numero)
    };
  };

  const ensureUniqueIdentificacion = async ({
    sociedadId,
    identificacionNormalizada,
    excludeId = null
  }) => {
    const existing = await proveedoresRepo.getByIdentificacionNormalizada({
      sociedadId,
      identificacionNormalizada
    });
    if (!existing) {
      return;
    }

    if (excludeId && Number(existing.id) === Number(excludeId)) {
      return;
    }

    throw createError(409, 'Ya existe un proveedor con esa identificacion');
  };

  const createProveedor = async ({ user, ...payload }) => {
    const sociedadId = await ensureSociedadAccess({ user, sociedadId: payload.sociedad_id });
    const normalized = normalizeProveedorInput(payload || {});
    await ensureUniqueIdentificacion({
      sociedadId,
      identificacionNormalizada: normalized.identificacionNumeroNormalizado
    });
    return proveedoresRepo.createProveedor({
      sociedadId,
      ...normalized
    });
  };

  const updateProveedor = async ({ user, id, ...payload }) => {
    const proveedorId = toPositiveInt(id, 'id');
    const current = await proveedoresRepo.getProveedorById(proveedorId);
    if (!current) {
      throw createError(404, 'Proveedor no encontrado');
    }
    await ensureSociedadAccess({ user, sociedadId: current.sociedad_id });

    const normalized = normalizeProveedorInput(payload || {});
    await ensureUniqueIdentificacion({
      sociedadId: current.sociedad_id,
      identificacionNormalizada: normalized.identificacionNumeroNormalizado,
      excludeId: proveedorId
    });

    return proveedoresRepo.updateProveedor({
      id: proveedorId,
      ...normalized
    });
  };

  return {
    listProveedores,
    listProveedorHistorial,
    createProveedor,
    updateProveedor
  };
};

module.exports = { createProveedoresUseCases };
