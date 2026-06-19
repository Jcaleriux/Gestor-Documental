const { createSociedadesUseCases } = require('../services/sociedadesUseCases');

const createRepos = () => ({
  sociedadesRepo: {
    listSociedades: jest.fn(),
    listAllSociedades: jest.fn(),
    createSociedad: jest.fn(),
    updateSociedad: jest.fn(),
  },
  usuariosSociedadesRepo: {
    listSociedadesByUsuarioId: jest.fn(),
  },
});

describe('sociedadesUseCases', () => {
  test('lista sociedades operativas activas para acceso total', async () => {
    const repos = createRepos();
    repos.sociedadesRepo.listSociedades.mockResolvedValue([
      { id: 1, razon_social: 'Activa SA', activo: true },
    ]);
    const useCases = createSociedadesUseCases(repos);

    const result = await useCases.listSociedades({
      user: { permissions: ['acceso_total'] },
    });

    expect(result).toEqual([{ id: 1, razon_social: 'Activa SA', activo: true }]);
    expect(repos.sociedadesRepo.listSociedades).toHaveBeenCalledTimes(1);
    expect(repos.usuariosSociedadesRepo.listSociedadesByUsuarioId).not.toHaveBeenCalled();
  });

  test('lista sociedades asignadas para usuario con alcance asignado', async () => {
    const repos = createRepos();
    repos.usuariosSociedadesRepo.listSociedadesByUsuarioId.mockResolvedValue([
      { id: 2, razon_social: 'Asignada SA', activo: true },
    ]);
    const useCases = createSociedadesUseCases(repos);

    const result = await useCases.listSociedades({
      user: { id: 99, permissions: ['sociedades_asignadas'] },
    });

    expect(result).toEqual([{ id: 2, razon_social: 'Asignada SA', activo: true }]);
    expect(repos.usuariosSociedadesRepo.listSociedadesByUsuarioId).toHaveBeenCalledWith(99);
    expect(repos.sociedadesRepo.listSociedades).not.toHaveBeenCalled();
  });

  test('lista admin incluye sociedades activas e inactivas', async () => {
    const repos = createRepos();
    repos.sociedadesRepo.listAllSociedades.mockResolvedValue([
      { id: 1, activo: true },
      { id: 2, activo: false },
    ]);
    const useCases = createSociedadesUseCases(repos);

    await expect(useCases.listSociedadesAdmin()).resolves.toEqual([
      { id: 1, activo: true },
      { id: 2, activo: false },
    ]);
  });

  test('crea sociedad normalizando espacios y vacios opcionales', async () => {
    const repos = createRepos();
    repos.sociedadesRepo.createSociedad.mockResolvedValue({ id: 10 });
    const useCases = createSociedadesUseCases(repos);

    await expect(useCases.createSociedad({
      codigo: ' BSP ',
      nombre_proyecto: '',
      razon_social: ' Bio San Pablo SA ',
      cedula_juridica: ' 3101887961 ',
    })).resolves.toEqual({ id: 10 });

    expect(repos.sociedadesRepo.createSociedad).toHaveBeenCalledWith({
      codigo: 'BSP',
      nombreProyecto: null,
      razonSocial: 'Bio San Pablo SA',
      cedulaJuridica: '3101887961',
      activo: true,
    });
  });

  test('rechaza duplicado de cedula juridica con 409', async () => {
    const repos = createRepos();
    repos.sociedadesRepo.createSociedad.mockRejectedValue({
      code: '23505',
      constraint: 'sociedades_cedula_juridica_key',
    });
    const useCases = createSociedadesUseCases(repos);

    await expect(useCases.createSociedad({
      razon_social: 'Duplicada SA',
      cedula_juridica: '3101000000',
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe una sociedad con esa cedula juridica',
    });
  });

  test('actualiza sociedad y permite inactivar', async () => {
    const repos = createRepos();
    repos.sociedadesRepo.updateSociedad.mockResolvedValue({ id: 7, activo: false });
    const useCases = createSociedadesUseCases(repos);

    await expect(useCases.updateSociedad({
      id: '7',
      codigo: 'BSP',
      nombre_proyecto: 'Bio San Pablo',
      razon_social: 'Bio San Pablo SA',
      cedula_juridica: '3101887961',
      activo: false,
    })).resolves.toEqual({ id: 7, activo: false });

    expect(repos.sociedadesRepo.updateSociedad).toHaveBeenCalledWith({
      sociedadId: 7,
      codigo: 'BSP',
      nombreProyecto: 'Bio San Pablo',
      razonSocial: 'Bio San Pablo SA',
      cedulaJuridica: '3101887961',
      activo: false,
    });
  });
});
