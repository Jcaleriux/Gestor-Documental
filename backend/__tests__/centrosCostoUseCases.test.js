const { createCentrosCostoUseCases } = require('../services/centrosCostoUseCases');

const user = {
  id: 99,
  email: 'admin@SendaDocs.test',
  permissions: ['acceso_total']
};

const createRepo = (overrides = {}) => ({
  listCentrosCostoBySociedad: jest.fn().mockResolvedValue([]),
  getCentroCostoById: jest.fn().mockResolvedValue(null),
  getCentroCostoBySociedadAndCodigo: jest.fn().mockResolvedValue(null),
  createCentroCosto: jest.fn(async (payload) => ({ id: 1, ...payload })),
  updateCentroCosto: jest.fn(async (payload) => ({ ...payload })),
  upsertCentroCostoByCodigo: jest.fn(async (payload) => ({
    id: payload.codigo === 'PADRE' ? 10 : 11,
    codigo: payload.codigo,
    centro_padre_id: payload.centroPadreId
  })),
  ...overrides
});

const createUseCases = (overrides = {}) => {
  const centrosCostoRepo = createRepo(overrides.centrosCostoRepo);
  const usuariosRepo = {
    getUsuarioById: jest.fn().mockResolvedValue({ id: 77, activo: true }),
    ...overrides.usuariosRepo
  };
  const rolesRepo = {
    getRoleById: jest.fn().mockResolvedValue({ id: 8, nombre: 'Aprobador' }),
    ...overrides.rolesRepo
  };
  const runInTransaction = jest.fn(async (handler) => handler({ tx: true }));

  return {
    useCases: createCentrosCostoUseCases({
      centrosCostoRepo,
      usuariosRepo,
      rolesRepo,
      runInTransaction: overrides.runInTransaction || runInTransaction
    }),
    centrosCostoRepo,
    usuariosRepo,
    rolesRepo,
    runInTransaction: overrides.runInTransaction || runInTransaction
  };
};

describe('centrosCostoUseCases', () => {
  test('valida dependencias requeridas', () => {
    expect(() => createCentrosCostoUseCases({})).toThrow('centrosCostoRepo requerido');
    expect(() => createCentrosCostoUseCases({
      centrosCostoRepo: {},
      usuariosRepo: {},
      rolesRepo: {}
    })).toThrow('runInTransaction requerido');
  });

  test('lista centros validando acceso y normalizando sociedad', async () => {
    const { useCases, centrosCostoRepo } = createUseCases({
      centrosCostoRepo: {
        listCentrosCostoBySociedad: jest.fn().mockResolvedValue([{ id: 1, codigo: 'ADM' }])
      }
    });

    await expect(useCases.listCentrosCosto({
      user,
      sociedadId: '18'
    })).resolves.toEqual([{ id: 1, codigo: 'ADM' }]);

    expect(centrosCostoRepo.listCentrosCostoBySociedad).toHaveBeenCalledWith(18);
  });

  test('crea centro normalizando codigo, aprobador y defaults internos', async () => {
    const { useCases, centrosCostoRepo, usuariosRepo } = createUseCases({
      centrosCostoRepo: {
        getCentroCostoById: jest.fn().mockResolvedValue({ id: 5, sociedad_id: 18 }),
        getCentroCostoBySociedadAndCodigo: jest.fn().mockResolvedValue(null)
      }
    });

    const result = await useCases.createCentroCosto({
      user,
      sociedad_id: '18',
      codigo: ' adm-01 ',
      nombre: ' Administracion ',
      centro_padre_id: '5',
      usuario_aprobador_id: '77',
      orden: '2',
      metadata: { origen: 'csv' }
    });

    expect(result.codigo).toBe('ADM-01');
    expect(usuariosRepo.getUsuarioById).toHaveBeenCalledWith(77, undefined);
    expect(centrosCostoRepo.createCentroCosto).toHaveBeenCalledWith({
      sociedadId: 18,
      codigo: 'ADM-01',
      nombre: 'Administracion',
      centroPadreId: 5,
      usuarioAprobadorId: 77,
      rolAprobadorId: null,
      seleccionableEnContabilizacion: true,
      activo: true,
      orden: 2,
      metadata: { origen: 'csv' },
      creadoPor: 'admin@SendaDocs.test'
    });
  });

  test('rechaza asignacion de aprobador ambigua o inexistente', async () => {
    const { useCases } = createUseCases();

    await expect(useCases.createCentroCosto({
      user,
      sociedad_id: 18,
      codigo: 'ADM',
      nombre: 'Administracion',
      usuario_aprobador_id: 77,
      rol_aprobador_id: 8
    })).rejects.toMatchObject({
      status: 400,
      message: 'Debe indicar usuario_aprobador_id o rol_aprobador_id, pero no ambos'
    });

    const inactive = createUseCases({
      usuariosRepo: {
        getUsuarioById: jest.fn().mockResolvedValue({ id: 77, activo: false })
      }
    });

    await expect(inactive.useCases.createCentroCosto({
      user,
      sociedad_id: 18,
      codigo: 'ADM',
      nombre: 'Administracion',
      usuario_aprobador_id: 77
    })).rejects.toMatchObject({
      status: 400,
      message: 'usuario_aprobador_id invalido'
    });
  });

  test('updateCentroCosto evita duplicados, padres fuera de sociedad y ciclos', async () => {
    const { useCases } = createUseCases({
      centrosCostoRepo: {
        getCentroCostoById: jest.fn()
          .mockResolvedValueOnce({ id: 1, sociedad_id: 18 })
          .mockResolvedValueOnce({ id: 3, sociedad_id: 18 }),
        getCentroCostoBySociedadAndCodigo: jest.fn().mockResolvedValue({ id: 1, codigo: 'ADM' }),
        listCentrosCostoBySociedad: jest.fn().mockResolvedValue([
          { id: 1, centro_padre_id: null },
          { id: 2, centro_padre_id: 1 },
          { id: 3, centro_padre_id: 2 }
        ])
      }
    });

    await expect(useCases.updateCentroCosto({
      user,
      id: 1,
      codigo: 'ADM',
      nombre: 'Administracion',
      centro_padre_id: 3,
      rol_aprobador_id: 8
    })).rejects.toMatchObject({
      status: 400,
      message: 'El centro padre seleccionado genera una jerarquia circular'
    });
  });

  test('bulkUpsertCentrosCosto resuelve padres por codigo dentro de una transaccion', async () => {
    const client = { tx: true };
    const runInTransaction = jest.fn(async (handler) => handler(client));
    const { useCases, centrosCostoRepo, rolesRepo } = createUseCases({
      runInTransaction,
      centrosCostoRepo: {
        listCentrosCostoBySociedad: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 10, codigo: 'PADRE' }, { id: 11, codigo: 'HIJO' }]),
        upsertCentroCostoByCodigo: jest.fn(async (payload) => ({
          id: payload.codigo === 'PADRE' ? 10 : 11,
          codigo: payload.codigo
        }))
      }
    });

    const result = await useCases.bulkUpsertCentrosCosto({
      user,
      sociedadId: '18',
      centros: [
        { codigo: 'padre', nombre: 'Padre', rol_aprobador_id: 8 },
        { codigo: 'hijo', nombre: 'Hijo', codigo_padre: 'padre', rol_aprobador_id: 8 }
      ]
    });

    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(rolesRepo.getRoleById).toHaveBeenCalledWith(8, client);
    expect(centrosCostoRepo.upsertCentroCostoByCodigo).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sociedadId: 18,
      codigo: 'PADRE',
      centroPadreId: null,
      rolAprobadorId: 8
    }), client);
    expect(centrosCostoRepo.upsertCentroCostoByCodigo).toHaveBeenNthCalledWith(2, expect.objectContaining({
      sociedadId: 18,
      codigo: 'HIJO',
      centroPadreId: 10,
      rolAprobadorId: 8
    }), client);
    expect(result).toEqual([{ id: 10, codigo: 'PADRE' }, { id: 11, codigo: 'HIJO' }]);
  });

  test('bulkUpsertCentrosCosto rechaza duplicados y padres inexistentes', async () => {
    const { useCases } = createUseCases();

    await expect(useCases.bulkUpsertCentrosCosto({
      user,
      sociedadId: 18,
      centros: [
        { codigo: 'ADM', nombre: 'Uno', rol_aprobador_id: 8 },
        { codigo: 'adm', nombre: 'Dos', rol_aprobador_id: 8 }
      ]
    })).rejects.toMatchObject({
      status: 400,
      message: 'Codigo duplicado en carga masiva: ADM'
    });

    await expect(useCases.bulkUpsertCentrosCosto({
      user,
      sociedadId: 18,
      centros: [
        { codigo: 'HIJO', nombre: 'Hijo', codigo_padre: 'NO_EXISTE', rol_aprobador_id: 8 }
      ]
    })).rejects.toMatchObject({
      status: 400,
      message: 'No se encontro codigo_padre NO_EXISTE para HIJO'
    });
  });
});
