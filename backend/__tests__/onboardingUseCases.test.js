const bcrypt = require('bcrypt');
const { createOnboardingUseCases, ONBOARDING_SETUP_LOCK_ID } = require('../services/onboardingUseCases');

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

const createClient = () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
});

const createDeps = (overrides = {}) => {
  const client = overrides.client || createClient();
  return {
    client,
    pool: {
      connect: jest.fn().mockResolvedValue(client),
    },
    usuariosRepo: {
      countActiveUsuarios: jest.fn().mockResolvedValue(0),
      countActiveAdmins: jest.fn().mockResolvedValue(0),
      getByEmail: jest.fn().mockResolvedValue(null),
      createUsuario: jest.fn(),
    },
    rolesRepo: {
      getRoleByCodigo: jest.fn(),
    },
    ...overrides,
  };
};

describe('onboardingUseCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('$2b$12$hash-onboarding');
  });

  test('getStatus requiere setup solo cuando no hay usuarios ni admins activos', async () => {
    const deps = createDeps();
    const useCases = createOnboardingUseCases(deps);

    await expect(useCases.getStatus()).resolves.toEqual({
      requiresSetup: true,
      setupAllowed: true,
    });

    deps.usuariosRepo.countActiveUsuarios.mockResolvedValue(1);
    deps.usuariosRepo.countActiveAdmins.mockResolvedValue(1);

    await expect(useCases.getStatus()).resolves.toEqual({
      requiresSetup: false,
      setupAllowed: false,
    });
  });

  test('setupInitialAdmin crea el primer admin dentro de transaccion', async () => {
    const deps = createDeps();
    deps.rolesRepo.getRoleByCodigo.mockResolvedValue({ id: 3, codigo: 'admin' });
    deps.usuariosRepo.createUsuario.mockResolvedValue({
      id: 8,
      nombre: 'Ana Admin',
      email: 'ana@sendadocs.local',
      rol_codigo: 'admin',
      activo: true,
    });
    const useCases = createOnboardingUseCases(deps);

    const result = await useCases.setupInitialAdmin({
      nombre: '  Ana Admin  ',
      email: ' ANA@SendaDocs.local ',
      password: 'ClaveFuerte2026!',
    });

    expect(deps.pool.connect).toHaveBeenCalledTimes(1);
    expect(deps.client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(deps.client.query).toHaveBeenNthCalledWith(
      2,
      'SELECT pg_advisory_xact_lock($1)',
      [ONBOARDING_SETUP_LOCK_ID]
    );
    expect(deps.usuariosRepo.countActiveUsuarios).toHaveBeenCalledWith(deps.client);
    expect(deps.usuariosRepo.countActiveAdmins).toHaveBeenCalledWith(deps.client);
    expect(deps.rolesRepo.getRoleByCodigo).toHaveBeenCalledWith('admin', deps.client);
    expect(deps.usuariosRepo.getByEmail).toHaveBeenCalledWith('ana@sendadocs.local', deps.client);
    expect(bcrypt.hash).toHaveBeenCalledWith('ClaveFuerte2026!', expect.any(Number));
    expect(deps.usuariosRepo.createUsuario).toHaveBeenCalledWith({
      nombre: 'Ana Admin',
      email: 'ana@sendadocs.local',
      passwordHash: '$2b$12$hash-onboarding',
      rolId: 3,
      activo: true,
    }, deps.client);
    expect(deps.client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(deps.client.release).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      user: {
        id: 8,
        nombre: 'Ana Admin',
        email: 'ana@sendadocs.local',
        rol_codigo: 'admin',
        activo: true,
      },
      status: {
        requiresSetup: false,
        setupAllowed: false,
      },
    });
  });

  test('setupInitialAdmin rechaza si el sistema ya tiene usuario activo', async () => {
    const deps = createDeps();
    deps.usuariosRepo.countActiveUsuarios.mockResolvedValue(1);
    const useCases = createOnboardingUseCases(deps);

    await expect(useCases.setupInitialAdmin({
      nombre: 'Admin',
      email: 'admin@sendadocs.local',
      password: 'ClaveFuerte2026!',
    })).rejects.toMatchObject({
      status: 409,
      message: 'El sistema ya fue configurado',
    });

    expect(deps.rolesRepo.getRoleByCodigo).not.toHaveBeenCalled();
    expect(deps.usuariosRepo.createUsuario).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(deps.client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(deps.client.release).toHaveBeenCalledTimes(1);
  });

  test('setupInitialAdmin rechaza email duplicado aunque el usuario este inactivo', async () => {
    const deps = createDeps();
    deps.rolesRepo.getRoleByCodigo.mockResolvedValue({ id: 3, codigo: 'admin' });
    deps.usuariosRepo.getByEmail.mockResolvedValue({ id: 99, activo: false });
    const useCases = createOnboardingUseCases(deps);

    await expect(useCases.setupInitialAdmin({
      nombre: 'Admin',
      email: 'admin@sendadocs.local',
      password: 'ClaveFuerte2026!',
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un usuario con ese email',
    });

    expect(deps.usuariosRepo.createUsuario).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(deps.client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(deps.client.release).toHaveBeenCalledTimes(1);
  });
});
