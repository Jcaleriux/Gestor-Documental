const bcrypt = require('bcrypt');
const { BCRYPT_ROUNDS } = require('../config/auth');
const { withTransaction } = require('../db/withTransaction');
const { createError } = require('../utils/errors');

const ADMIN_ROLE_CODE = 'admin';
const ONBOARDING_SETUP_LOCK_ID = 20261104;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeName = (name) => String(name || '').trim();

const toPublicStatus = ({ activeUserCount, activeAdminCount }) => {
  const setupAllowed = activeUserCount === 0 && activeAdminCount === 0;

  return {
    requiresSetup: setupAllowed,
    setupAllowed,
  };
};

const createOnboardingUseCases = ({
  pool,
  usuariosRepo,
  rolesRepo,
}) => {
  if (!pool) {
    throw new Error('pool requerido');
  }
  if (!usuariosRepo) {
    throw new Error('usuariosRepo requerido');
  }
  if (!rolesRepo) {
    throw new Error('rolesRepo requerido');
  }

  const getRawStatus = async (client) => {
    const activeUserCount = await usuariosRepo.countActiveUsuarios(client);
    const activeAdminCount = await usuariosRepo.countActiveAdmins(client);

    return {
      activeUserCount,
      activeAdminCount,
    };
  };

  const getStatus = async (client) => {
    return toPublicStatus(await getRawStatus(client));
  };

  const setupInitialAdmin = async ({
    nombre,
    email,
    password,
  }) => {
    const normalizedName = normalizeName(nombre);
    const normalizedEmail = normalizeEmail(email);

    return withTransaction(
      () => pool.connect(),
      async (client) => {
        await client.query('SELECT pg_advisory_xact_lock($1)', [ONBOARDING_SETUP_LOCK_ID]);

        const status = await getStatus(client);
        if (!status.setupAllowed) {
          throw createError(409, 'El sistema ya fue configurado');
        }

        const adminRole = await rolesRepo.getRoleByCodigo(ADMIN_ROLE_CODE, client);
        if (!adminRole) {
          throw createError(500, 'El rol administrador no esta configurado');
        }

        const existingUser = await usuariosRepo.getByEmail(normalizedEmail, client);
        if (existingUser) {
          throw createError(409, 'Ya existe un usuario con ese email');
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await usuariosRepo.createUsuario({
          nombre: normalizedName,
          email: normalizedEmail,
          passwordHash,
          rolId: adminRole.id,
          activo: true,
        }, client);

        return {
          user,
          status: {
            requiresSetup: false,
            setupAllowed: false,
          },
        };
      }
    );
  };

  return {
    getStatus,
    setupInitialAdmin,
  };
};

module.exports = {
  ADMIN_ROLE_CODE,
  ONBOARDING_SETUP_LOCK_ID,
  createOnboardingUseCases,
};
