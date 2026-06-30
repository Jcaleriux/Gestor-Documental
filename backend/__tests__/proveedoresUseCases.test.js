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
  test('lista proveedores validando acceso a la sociedad', async () => {
    const repo = createRepo({
      listProveedoresBySociedad: jest.fn().mockResolvedValue([
        { id: 1, nombre: 'Proveedor QA' }
      ])
    });
    const useCases = createProveedoresUseCases({ proveedoresRepo: repo });

    await expect(useCases.listProveedores({
      user: { id: 99, permissions: ['acceso_total'] },
      sociedadId: '18'
    })).resolves.toEqual([{ id: 1, nombre: 'Proveedor QA' }]);

    expect(repo.listProveedoresBySociedad).toHaveBeenCalledWith(18);
  });

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

  test('crea proveedor normalizando identificacion, textos opcionales y correo', async () => {
    const repo = createRepo({
      getByIdentificacionNormalizada: jest.fn().mockResolvedValue(null),
      createProveedor: jest.fn().mockResolvedValue({ id: 11, nombre: 'Proveedor Uno' })
    });
    const useCases = createProveedoresUseCases({ proveedoresRepo: repo });

    await expect(useCases.createProveedor({
      user: { id: 99, permissions: ['acceso_total'] },
      sociedad_id: '18',
      identificacion_tipo: ' 02 ',
      identificacion_numero: ' 3-101-123456 ',
      nombre: '  Proveedor Uno ',
      nombre_comercial: '',
      correo_electronico: '  FACTURAS@PROVEEDOR.COM ',
      telefono_codigo_pais: ' 506 ',
      telefono_numero: ' 2222-3333 '
    })).resolves.toEqual({ id: 11, nombre: 'Proveedor Uno' });

    expect(repo.getByIdentificacionNormalizada).toHaveBeenCalledWith({
      sociedadId: 18,
      identificacionNormalizada: '3101123456'
    });
    expect(repo.createProveedor).toHaveBeenCalledWith({
      sociedadId: 18,
      identificacionTipo: '02',
      identificacionNumero: '3-101-123456',
      identificacionNumeroNormalizado: '3101123456',
      nombre: 'Proveedor Uno',
      nombreComercial: null,
      correoElectronico: 'facturas@proveedor.com',
      telefonoCodigoPais: '506',
      telefonoNumero: '2222-3333'
    });
  });

  test('rechaza proveedor sin identificacion, sin nombre o con identificacion duplicada', async () => {
    const repo = createRepo();
    const useCases = createProveedoresUseCases({ proveedoresRepo: repo });

    await expect(useCases.createProveedor({
      user: { id: 99, permissions: ['acceso_total'] },
      sociedad_id: 18,
      identificacion_numero: '',
      nombre: 'Proveedor Uno'
    })).rejects.toMatchObject({
      status: 400,
      message: 'identificacion_numero invalido'
    });

    await expect(useCases.createProveedor({
      user: { id: 99, permissions: ['acceso_total'] },
      sociedad_id: 18,
      identificacion_numero: '3101123456',
      nombre: ' '
    })).rejects.toMatchObject({
      status: 400,
      message: 'nombre requerido'
    });

    repo.getByIdentificacionNormalizada.mockResolvedValue({ id: 4 });
    await expect(useCases.createProveedor({
      user: { id: 99, permissions: ['acceso_total'] },
      sociedad_id: 18,
      identificacion_numero: '3101123456',
      nombre: 'Proveedor Uno'
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un proveedor con esa identificacion'
    });

    expect(repo.createProveedor).not.toHaveBeenCalled();
  });

  test('actualiza proveedor existente permitiendo conservar su misma identificacion', async () => {
    const repo = createRepo({
      getProveedorById: jest.fn().mockResolvedValue({ id: 7, sociedad_id: 18 }),
      getByIdentificacionNormalizada: jest.fn().mockResolvedValue({ id: 7 }),
      updateProveedor: jest.fn().mockResolvedValue({ id: 7, nombre: 'Proveedor Editado' })
    });
    const useCases = createProveedoresUseCases({ proveedoresRepo: repo });

    await expect(useCases.updateProveedor({
      user: { id: 99, permissions: ['acceso_total'] },
      id: '7',
      identificacion_tipo: '02',
      identificacion_numero: '3101123456',
      nombre: 'Proveedor Editado',
      correo_electronico: null
    })).resolves.toEqual({ id: 7, nombre: 'Proveedor Editado' });

    expect(repo.updateProveedor).toHaveBeenCalledWith({
      id: 7,
      identificacionTipo: '02',
      identificacionNumero: '3101123456',
      identificacionNumeroNormalizado: '3101123456',
      nombre: 'Proveedor Editado',
      nombreComercial: null,
      correoElectronico: null,
      telefonoCodigoPais: null,
      telefonoNumero: null
    });
  });

  test('rechaza actualizacion de proveedor inexistente o identificacion de otro proveedor', async () => {
    const repo = createRepo();
    const useCases = createProveedoresUseCases({ proveedoresRepo: repo });

    repo.getProveedorById.mockResolvedValueOnce(null);
    await expect(useCases.updateProveedor({
      user: { id: 99, permissions: ['acceso_total'] },
      id: 7,
      identificacion_numero: '3101123456',
      nombre: 'Proveedor Editado'
    })).rejects.toMatchObject({
      status: 404,
      message: 'Proveedor no encontrado'
    });

    repo.getProveedorById.mockResolvedValueOnce({ id: 7, sociedad_id: 18 });
    repo.getByIdentificacionNormalizada.mockResolvedValueOnce({ id: 99 });
    await expect(useCases.updateProveedor({
      user: { id: 99, permissions: ['acceso_total'] },
      id: 7,
      identificacion_numero: '3101123456',
      nombre: 'Proveedor Editado'
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un proveedor con esa identificacion'
    });

    expect(repo.updateProveedor).not.toHaveBeenCalled();
  });
});
