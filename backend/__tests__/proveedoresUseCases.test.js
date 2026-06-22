const { createProveedoresUseCases } = require('../services/proveedoresUseCases');

const createRepo = (overrides = {}) => ({
  listProveedoresBySociedad: jest.fn(),
  getProveedorById: jest.fn(),
  getByIdentificacionNormalizada: jest.fn(),
  listProveedorHistorialCambios: jest.fn(),
  createProveedor: jest.fn(),
  updateProveedor: jest.fn(),
  ...overrides
});

describe('proveedoresUseCases', () => {
  test('lista historial de proveedor validando acceso a la sociedad', async () => {
    const repo = createRepo({
      getProveedorById: jest.fn().mockResolvedValue({
        id: 7,
        sociedad_id: 18,
        nombre: 'Proveedor QA'
      }),
      listProveedorHistorialCambios: jest.fn().mockResolvedValue([
        { id: 1, proveedor_id: 7, campo: 'nombre' }
      ])
    });
    const useCases = createProveedoresUseCases({ proveedoresRepo: repo });

    await expect(useCases.listProveedorHistorial({
      user: { id: 99, permissions: ['acceso_total'] },
      id: '7'
    })).resolves.toEqual([{ id: 1, proveedor_id: 7, campo: 'nombre' }]);

    expect(repo.getProveedorById).toHaveBeenCalledWith(7);
    expect(repo.listProveedorHistorialCambios).toHaveBeenCalledWith({ proveedorId: 7 });
  });

  test('rechaza historial de proveedor inexistente', async () => {
    const repo = createRepo({
      getProveedorById: jest.fn().mockResolvedValue(null)
    });
    const useCases = createProveedoresUseCases({ proveedoresRepo: repo });

    await expect(useCases.listProveedorHistorial({
      user: { id: 99, permissions: ['acceso_total'] },
      id: '7'
    })).rejects.toMatchObject({
      status: 404,
      message: 'Proveedor no encontrado'
    });

    expect(repo.listProveedorHistorialCambios).not.toHaveBeenCalled();
  });
});
