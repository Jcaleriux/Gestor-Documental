const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

jest.mock('../repositories/usuariosRepository', () => ({
  getByEmail: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock('../services/permissionsService', () => ({
  permissionsService: {
    listPermissionsByRole: jest.fn(),
  },
}));

const usuariosRepo = require('../repositories/usuariosRepository');
const { permissionsService } = require('../services/permissionsService');
const { login } = require('../services/authService');

describe('authService login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwt.sign.mockReturnValue('token-demo');
    permissionsService.listPermissionsByRole.mockResolvedValue(['documentos_ver']);
  });

  test('acepta usuario con password bcrypt sin rehash innecesario', async () => {
    usuariosRepo.getByEmail.mockResolvedValue({
      id: 7,
      nombre: 'Admin',
      email: 'admin@novogar.local',
      rol_id: 3,
      password: '$2b$12$hash-existente',
      activo: true,
    });
    bcrypt.compare.mockResolvedValue(true);

    const result = await login({
      email: 'admin@novogar.local',
      password: 'Novogar2026!',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('Novogar2026!', '$2b$12$hash-existente');
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(usuariosRepo.updatePassword).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      token: 'token-demo',
      user: {
        email: 'admin@novogar.local',
        permissions: ['documentos_ver'],
      },
    });
  });

  test('migra password legacy en texto plano a bcrypt al autenticarse', async () => {
    usuariosRepo.getByEmail.mockResolvedValue({
      id: 9,
      nombre: 'Legacy',
      email: 'legacy@novogar.local',
      rol_id: 4,
      password: 'clave-legacy',
      activo: true,
    });
    bcrypt.hash.mockResolvedValue('$2b$12$hash-nuevo');

    const result = await login({
      email: 'legacy@novogar.local',
      password: 'clave-legacy',
    });

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith('clave-legacy', expect.any(Number));
    expect(usuariosRepo.updatePassword).toHaveBeenCalledWith(9, '$2b$12$hash-nuevo');
    expect(result.token).toBe('token-demo');
  });

  test('rechaza credenciales invalidas', async () => {
    usuariosRepo.getByEmail.mockResolvedValue({
      id: 11,
      nombre: 'User',
      email: 'user@novogar.local',
      rol_id: 2,
      password: '$2b$12$hash-existente',
      activo: true,
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(login({
      email: 'user@novogar.local',
      password: 'mala-clave',
    })).rejects.toMatchObject({
      status: 401,
      message: 'Credenciales incorrectas',
    });

    expect(usuariosRepo.updatePassword).not.toHaveBeenCalled();
  });
});
