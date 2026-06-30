const bcrypt = require('bcrypt');
const { createUsuariosUseCases } = require('../services/usuariosUseCases');

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

const createClient = () => ({
  query: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
});

const createRepos = (overrides = {}) => ({
  usuariosRepo: {
    listUsuarios: jest.fn(),
    getByEmail: jest.fn(),
    getUsuarioById: jest.fn(),
    createUsuario: jest.fn(),
    updateUsuario: jest.fn(),
    updatePassword: jest.fn(),
  },
  rolesRepo: {
    listRoles: jest.fn(),
    getRoleById: jest.fn(),
  },
  sociedadesRepo: {
    listSociedadesByIds: jest.fn(),
  },
  usuariosSociedadesRepo: {
    getClient: jest.fn(),
    listSociedadesByUsuarioId: jest.fn(),
    listSociedadIdsByUsuarioId: jest.fn(),
    replaceSociedadesByUsuarioId: jest.fn(),
  },
  ...overrides
});

describe('usuariosUseCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('$2b$12$hash-demo');
  });

  test('lista usuarios y roles usando sus repositorios', async () => {
    const repos = createRepos();
    repos.usuariosRepo.listUsuarios.mockResolvedValue([{ id: 1, email: 'admin@novogar.local' }]);
    repos.rolesRepo.listRoles.mockResolvedValue([{ id: 2, nombre: 'Contabilidad' }]);
    const useCases = createUsuariosUseCases(repos);

    await expect(useCases.listUsuarios()).resolves.toEqual([{ id: 1, email: 'admin@novogar.local' }]);
    await expect(useCases.listRoles()).resolves.toEqual([{ id: 2, nombre: 'Contabilidad' }]);
  });

  test('crea usuario normalizando nombre/email, validando rol y hasheando password', async () => {
    const repos = createRepos();
    repos.rolesRepo.getRoleById.mockResolvedValue({ id: 3 });
    repos.usuariosRepo.getByEmail.mockResolvedValue(null);
    repos.usuariosRepo.createUsuario.mockResolvedValue({ id: 9, email: 'qa@novogar.local' });
    const useCases = createUsuariosUseCases(repos);

    const result = await useCases.createUsuario({
      nombre: '  QA User  ',
      email: '  QA@Novogar.Local ',
      password: 'Novogar2026!',
      rol_id: '3',
    });

    expect(result).toEqual({ id: 9, email: 'qa@novogar.local' });
    expect(repos.rolesRepo.getRoleById).toHaveBeenCalledWith(3);
    expect(repos.usuariosRepo.getByEmail).toHaveBeenCalledWith('qa@novogar.local');
    expect(bcrypt.hash).toHaveBeenCalledWith('Novogar2026!', expect.any(Number));
    expect(repos.usuariosRepo.createUsuario).toHaveBeenCalledWith({
      nombre: 'QA User',
      email: 'qa@novogar.local',
      passwordHash: '$2b$12$hash-demo',
      rolId: 3,
      activo: true,
    });
  });

  test('rechaza rol invalido y email duplicado al crear usuario', async () => {
    const repos = createRepos();
    const useCases = createUsuariosUseCases(repos);

    repos.rolesRepo.getRoleById.mockResolvedValue(null);
    await expect(useCases.createUsuario({
      nombre: 'QA',
      email: 'qa@novogar.local',
      password: 'Novogar2026!',
      rol_id: 99,
    })).rejects.toMatchObject({
      status: 400,
      message: 'rol_id invalido',
    });

    repos.rolesRepo.getRoleById.mockResolvedValue({ id: 3 });
    repos.usuariosRepo.getByEmail.mockResolvedValue({ id: 7 });
    await expect(useCases.createUsuario({
      nombre: 'QA',
      email: 'qa@novogar.local',
      password: 'Novogar2026!',
      rol_id: 3,
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un usuario con ese email',
    });

    expect(repos.usuariosRepo.createUsuario).not.toHaveBeenCalled();
  });

  test('actualiza usuario y solo cambia password cuando viene con contenido', async () => {
    const repos = createRepos();
    repos.usuariosRepo.getUsuarioById
      .mockResolvedValueOnce({ id: 8, email: 'actual@novogar.local' })
      .mockResolvedValueOnce({ id: 8, email: 'nuevo@novogar.local', password: '$2b$12$hash-demo' });
    repos.rolesRepo.getRoleById.mockResolvedValue({ id: 4 });
    repos.usuariosRepo.getByEmail.mockResolvedValue({ id: 8, email: 'nuevo@novogar.local' });
    repos.usuariosRepo.updateUsuario.mockResolvedValue({ id: 8, email: 'nuevo@novogar.local' });
    const useCases = createUsuariosUseCases(repos);

    const result = await useCases.updateUsuario({
      id: '8',
      nombre: '  Usuario Editado ',
      email: ' Nuevo@Novogar.Local ',
      rol_id: '4',
      activo: false,
      password: '  nueva-clave  ',
    });

    expect(repos.usuariosRepo.updateUsuario).toHaveBeenCalledWith({
      userId: 8,
      nombre: 'Usuario Editado',
      email: 'nuevo@novogar.local',
      rolId: 4,
      activo: false,
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('nueva-clave', expect.any(Number));
    expect(repos.usuariosRepo.updatePassword).toHaveBeenCalledWith(8, '$2b$12$hash-demo');
    expect(result).toEqual({ id: 8, email: 'nuevo@novogar.local', password: '$2b$12$hash-demo' });
  });

  test('rechaza update de usuario inexistente o email de otro usuario', async () => {
    const repos = createRepos();
    const useCases = createUsuariosUseCases(repos);

    repos.usuariosRepo.getUsuarioById.mockResolvedValueOnce(null);
    await expect(useCases.updateUsuario({
      id: 8,
      nombre: 'QA',
      email: 'qa@novogar.local',
      rol_id: 3,
    })).rejects.toMatchObject({
      status: 404,
      message: 'Usuario no encontrado',
    });

    repos.usuariosRepo.getUsuarioById.mockResolvedValueOnce({ id: 8 });
    repos.rolesRepo.getRoleById.mockResolvedValue({ id: 3 });
    repos.usuariosRepo.getByEmail.mockResolvedValue({ id: 9 });
    await expect(useCases.updateUsuario({
      id: 8,
      nombre: 'QA',
      email: 'qa@novogar.local',
      rol_id: 3,
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un usuario con ese email',
    });

    expect(repos.usuariosRepo.updateUsuario).not.toHaveBeenCalled();
  });

  test('lista sociedades asignadas validando que el usuario exista', async () => {
    const repos = createRepos();
    repos.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 8 });
    repos.usuariosSociedadesRepo.listSociedadesByUsuarioId.mockResolvedValue([
      { id: 18, razon_social: 'Bio San Pablo SA' }
    ]);
    repos.usuariosSociedadesRepo.listSociedadIdsByUsuarioId.mockResolvedValue([18]);
    const useCases = createUsuariosUseCases(repos);

    await expect(useCases.listSociedadesUsuario({ userId: '8' })).resolves.toEqual({
      usuario_id: 8,
      sociedad_ids: [18],
      sociedades: [{ id: 18, razon_social: 'Bio San Pablo SA' }]
    });
  });

  test('reemplaza sociedades de usuario dentro de transaccion y elimina duplicados', async () => {
    const client = createClient();
    const repos = createRepos();
    repos.usuariosSociedadesRepo.getClient.mockResolvedValue(client);
    repos.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 8 });
    repos.sociedadesRepo.listSociedadesByIds.mockResolvedValue([
      { id: 18 },
      { id: 19 },
    ]);
    repos.usuariosSociedadesRepo.listSociedadesByUsuarioId.mockResolvedValue([
      { id: 18, razon_social: 'Bio San Pablo SA' },
      { id: 19, razon_social: 'Novogar SA' },
    ]);
    const useCases = createUsuariosUseCases(repos);

    const result = await useCases.setSociedadesUsuario({
      userId: '8',
      sociedad_ids: ['18', 18, '19']
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(repos.usuariosRepo.getUsuarioById).toHaveBeenCalledWith(8, client);
    expect(repos.sociedadesRepo.listSociedadesByIds).toHaveBeenCalledWith([18, 19], client);
    expect(repos.usuariosSociedadesRepo.replaceSociedadesByUsuarioId).toHaveBeenCalledWith({
      usuarioId: 8,
      sociedadIds: [18, 19],
    }, client);
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      usuario_id: 8,
      sociedad_ids: [18, 19],
      sociedades: [
        { id: 18, razon_social: 'Bio San Pablo SA' },
        { id: 19, razon_social: 'Novogar SA' },
      ]
    });
  });

  test('hace rollback si una sociedad asignada no existe', async () => {
    const client = createClient();
    const repos = createRepos();
    repos.usuariosSociedadesRepo.getClient.mockResolvedValue(client);
    repos.usuariosRepo.getUsuarioById.mockResolvedValue({ id: 8 });
    repos.sociedadesRepo.listSociedadesByIds.mockResolvedValue([{ id: 18 }]);
    const useCases = createUsuariosUseCases(repos);

    await expect(useCases.setSociedadesUsuario({
      userId: 8,
      sociedad_ids: [18, 999]
    })).rejects.toMatchObject({
      status: 400,
      message: 'Una o mas sociedades no existen',
    });

    expect(repos.usuariosSociedadesRepo.replaceSociedadesByUsuarioId).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
