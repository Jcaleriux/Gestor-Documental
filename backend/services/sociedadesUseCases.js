const { PERMISSIONS } = require('../domain/permissions');
const { permissionsService } = require('./permissionsService');
const { createError } = require('../utils/errors');

const UNIQUE_VIOLATION = '23505';

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeRequiredString = (value, fieldName) => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw createError(400, `${fieldName} requerido`);
  }
  return normalized;
};

const normalizeBoolean = (value, fallback = true) => (
  typeof value === 'boolean' ? value : fallback
);

const toPositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }
  return parsed;
};

const mapUniqueSociedadError = (error) => {
  if (error?.code !== UNIQUE_VIOLATION) {
    throw error;
  }

  if (error.constraint === 'sociedades_codigo_key') {
    throw createError(409, 'Ya existe una sociedad con ese codigo');
  }

  if (error.constraint === 'sociedades_cedula_juridica_key') {
    throw createError(409, 'Ya existe una sociedad con esa cedula juridica');
  }

  throw createError(409, 'Ya existe una sociedad con esos datos');
};

const normalizeSociedadInput = ({
  codigo,
  nombre_proyecto,
  razon_social,
  cedula_juridica,
  activo
}) => ({
  codigo: normalizeOptionalString(codigo),
  nombreProyecto: normalizeOptionalString(nombre_proyecto),
  razonSocial: normalizeRequiredString(razon_social, 'razon_social'),
  cedulaJuridica: normalizeRequiredString(cedula_juridica, 'cedula_juridica'),
  activo: normalizeBoolean(activo, true)
});

const createSociedadesUseCases = ({ sociedadesRepo, usuariosSociedadesRepo }) => {
  if (!sociedadesRepo) {
    throw new Error('sociedadesRepo requerido');
  }
  if (!usuariosSociedadesRepo) {
    throw new Error('usuariosSociedadesRepo requerido');
  }

  const listSociedades = async ({ user }) => {
    const userPermissions = permissionsService.normalizePermissionList(user?.permissions);

    if (
      userPermissions.includes(PERMISSIONS.ACCESO_TOTAL)
      || userPermissions.includes(PERMISSIONS.SOCIEDADES_TODAS)
    ) {
      return sociedadesRepo.listSociedades();
    }

    if (userPermissions.includes(PERMISSIONS.SOCIEDADES_ASIGNADAS)) {
      return usuariosSociedadesRepo.listSociedadesByUsuarioId(user?.id);
    }

    return [];
  };

  const listSociedadesAdmin = async () => {
    return sociedadesRepo.listAllSociedades();
  };

  const createSociedad = async (payload) => {
    const sociedad = normalizeSociedadInput(payload || {});

    try {
      return await sociedadesRepo.createSociedad(sociedad);
    } catch (error) {
      mapUniqueSociedadError(error);
    }
  };

  const updateSociedad = async ({ id, ...payload }) => {
    const sociedadId = toPositiveInt(id, 'id');
    const sociedad = normalizeSociedadInput(payload || {});

    try {
      const updated = await sociedadesRepo.updateSociedad({
        sociedadId,
        ...sociedad
      });

      if (!updated) {
        throw createError(404, 'Sociedad no encontrada');
      }

      return updated;
    } catch (error) {
      mapUniqueSociedadError(error);
    }
  };

  return {
    listSociedades,
    listSociedadesAdmin,
    createSociedad,
    updateSociedad
  };
};

module.exports = { createSociedadesUseCases };
