const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../repositories/rolesRepository', () => ({
  getRoleById: jest.fn()
}));

jest.mock('../services/ordenesCompraAutoImportParser', () => ({
  extractOrdenCompraDataFromPdf: jest.fn()
}));

const rolesRepo = require('../repositories/rolesRepository');
const { extractOrdenCompraDataFromPdf } = require('../services/ordenesCompraAutoImportParser');
const { createOrdenesCompraUseCases } = require('../services/ordenesCompraUseCases');

const user = {
  id: 99,
  rol: 5,
  email: 'admin@novogar.test',
  permissions: ['acceso_total']
};

const pdfBase64 = () => Buffer.from('%PDF-1.4\nOrden de compra\n%%EOF', 'ascii').toString('base64');

const createRepo = (overrides = {}) => ({
  listOrdenesCompra: jest.fn().mockResolvedValue([]),
  createOrdenCompra: jest.fn(async (payload) => ({ id: 1, ...payload })),
  getOrdenCompraByIdAndSociedad: jest.fn().mockResolvedValue(null),
  countFacturasAsociadas: jest.fn().mockResolvedValue(0),
  deleteOrdenCompraById: jest.fn().mockResolvedValue(null),
  updateOrdenCompraEstado: jest.fn(async (payload) => ({ id: payload.id, estado: payload.estado })),
  ...overrides
});

const createUseCases = ({ repoOverrides = {}, proveedoresOverrides = {}, baseDir } = {}) => {
  const ordenesCompraRepo = createRepo(repoOverrides);
  const proveedoresRepo = {
    getProveedorByIdAndSociedad: jest.fn().mockResolvedValue({ id: 7, sociedad_id: 18 }),
    listProveedoresBySociedad: jest.fn().mockResolvedValue([{ id: 7, nombre: 'Proveedor Norte' }]),
    ...proveedoresOverrides
  };

  return {
    useCases: createOrdenesCompraUseCases({
      ordenesCompraRepo,
      proveedoresRepo,
      baseDir
    }),
    ordenesCompraRepo,
    proveedoresRepo
  };
};

describe('ordenesCompraUseCases', () => {
  let tempBaseDir;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novogar-ordenes-compra-'));
    jest.clearAllMocks();
    rolesRepo.getRoleById.mockResolvedValue({ id: 5, nivel_jerarquia: 80 });
    extractOrdenCompraDataFromPdf.mockReturnValue({
      numeroOc: '9876',
      fecha: '2026-03-15',
      moneda: 'USD',
      monto: 1234.56,
      proveedor: { id: 7, nombre: 'Proveedor Norte' },
      proveedorMatchType: 'identificacion',
      proveedorMatchConfidence: 1
    });
  });

  afterEach(() => {
    if (tempBaseDir && fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  test('valida dependencias requeridas', () => {
    expect(() => createOrdenesCompraUseCases({})).toThrow('ordenesCompraRepo requerido');
    expect(() => createOrdenesCompraUseCases({
      ordenesCompraRepo: {},
      proveedoresRepo: {}
    })).toThrow('baseDir requerido');
  });

  test('lista ordenes con filtros normalizados y traduce errores de schema', async () => {
    const { useCases, ordenesCompraRepo, proveedoresRepo } = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        listOrdenesCompra: jest.fn().mockResolvedValue([{ id: 1, estado: 'cerrada' }])
      }
    });

    await expect(useCases.listOrdenesCompra({
      user,
      sociedadId: '18',
      proveedorId: '7',
      estado: ' CERRADA '
    })).resolves.toEqual([{ id: 1, estado: 'cerrada' }]);

    expect(proveedoresRepo.getProveedorByIdAndSociedad).toHaveBeenCalledWith({
      id: 7,
      sociedadId: 18
    });
    expect(ordenesCompraRepo.listOrdenesCompra).toHaveBeenCalledWith({
      sociedadId: 18,
      proveedorId: 7,
      estado: 'cerrada'
    });

    const schemaError = new Error('relation missing');
    schemaError.code = '42P01';
    const failing = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        listOrdenesCompra: jest.fn().mockRejectedValue(schemaError)
      }
    });

    await expect(failing.useCases.listOrdenesCompra({
      user,
      sociedadId: 18
    })).rejects.toMatchObject({
      status: 500,
      message: 'Falta una migracion de schema requerida. Ejecute: npm run db:migrate'
    });
  });

  test('createOrdenCompra guarda PDF con numero normalizado y evita colisiones de nombre', async () => {
    const existingPath = path.join(tempBaseDir, 'documentos/ordenes_compra/18/7/123.pdf');
    fs.mkdirSync(path.dirname(existingPath), { recursive: true });
    fs.writeFileSync(existingPath, '%PDF-1.4 existente');

    const { useCases, ordenesCompraRepo } = createUseCases({ baseDir: tempBaseDir });

    const result = await useCases.createOrdenCompra({
      user,
      sociedad_id: '18',
      proveedor_id: '7',
      numero_oc: 'OC-123',
      nombre: '',
      monto: '1500.75',
      moneda: ' usd ',
      fecha: '2026-03-15T12:00:00.000Z',
      filename: 'oc 123.pdf',
      file_base64: `data:application/pdf;base64,${pdfBase64()}`,
      metadata: { origen: 'manual' }
    });

    expect(ordenesCompraRepo.createOrdenCompra).toHaveBeenCalledWith({
      sociedadId: 18,
      proveedorId: 7,
      nombre: '123',
      monto: 1500.75,
      moneda: 'USD',
      fecha: '2026-03-15',
      rutaPdf: 'documentos/ordenes_compra/18/7/123_2.pdf',
      creadoPor: 'admin@novogar.test',
      metadata: { origen: 'manual' }
    });
    expect(result.rutaPdf).toBe('documentos/ordenes_compra/18/7/123_2.pdf');
    expect(fs.existsSync(path.join(tempBaseDir, result.rutaPdf))).toBe(true);
  });

  test('autoImportOrdenCompra persiste datos extraidos del PDF', async () => {
    const { useCases, ordenesCompraRepo, proveedoresRepo } = createUseCases({ baseDir: tempBaseDir });

    const result = await useCases.autoImportOrdenCompra({
      user,
      sociedad_id: 18,
      filename: 'auto.pdf',
      file_base64: pdfBase64(),
      usuario: 'carga@novogar.test'
    });

    expect(proveedoresRepo.listProveedoresBySociedad).toHaveBeenCalledWith(18);
    expect(extractOrdenCompraDataFromPdf).toHaveBeenCalledWith({
      pdfBuffer: expect.any(Buffer),
      proveedores: [{ id: 7, nombre: 'Proveedor Norte' }]
    });
    expect(ordenesCompraRepo.createOrdenCompra).toHaveBeenCalledWith(expect.objectContaining({
      sociedadId: 18,
      proveedorId: 7,
      nombre: '9876',
      monto: 1234.56,
      moneda: 'USD',
      fecha: '2026-03-15',
      creadoPor: 'carga@novogar.test'
    }));
    expect(result.extraido).toEqual({
      proveedor_id: 7,
      proveedor_nombre: 'Proveedor Norte',
      proveedor_match_type: 'identificacion',
      proveedor_match_confidence: 1,
      numero_oc: '9876',
      monto: 1234.56,
      moneda: 'USD',
      fecha: '2026-03-15'
    });
  });

  test('autoImportOrdenCompra rechaza PDFs sin numero o proveedor reconocible', async () => {
    const { useCases, ordenesCompraRepo } = createUseCases({ baseDir: tempBaseDir });
    extractOrdenCompraDataFromPdf.mockReturnValueOnce({
      numeroOc: '',
      proveedor: { id: 7 },
      monto: 100,
      moneda: 'CRC',
      fecha: '2026-03-15'
    });

    await expect(useCases.autoImportOrdenCompra({
      user,
      sociedad_id: 18,
      filename: 'sin-numero.pdf',
      file_base64: pdfBase64()
    })).rejects.toMatchObject({
      status: 422,
      message: 'No se pudo extraer numero de OC en "sin-numero.pdf"'
    });

    extractOrdenCompraDataFromPdf.mockReturnValueOnce({
      numeroOc: '123',
      proveedor: null,
      monto: 100,
      moneda: 'CRC',
      fecha: '2026-03-15'
    });

    await expect(useCases.autoImportOrdenCompra({
      user,
      sociedad_id: 18,
      filename: 'sin-proveedor.pdf',
      file_base64: pdfBase64()
    })).rejects.toMatchObject({
      status: 422,
      message: 'No se pudo identificar proveedor en "sin-proveedor.pdf"'
    });
    expect(ordenesCompraRepo.createOrdenCompra).not.toHaveBeenCalled();
  });

  test('deleteOrdenCompra bloquea asociadas y elimina archivo cuando procede', async () => {
    const blocked = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        getOrdenCompraByIdAndSociedad: jest.fn().mockResolvedValue({ id: 20, sociedad_id: 18 }),
        countFacturasAsociadas: jest.fn().mockResolvedValue(1)
      }
    });

    await expect(blocked.useCases.deleteOrdenCompra({
      user,
      sociedadId: 18,
      ordenCompraId: 20
    })).rejects.toMatchObject({
      status: 409,
      message: 'Orden de compra asociada a factura.'
    });
    expect(blocked.ordenesCompraRepo.deleteOrdenCompraById).not.toHaveBeenCalled();

    const rutaPdf = 'documentos/ordenes_compra/18/7/20.pdf';
    const fullPath = path.join(tempBaseDir, rutaPdf);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '%PDF-1.4');

    const allowed = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        getOrdenCompraByIdAndSociedad: jest.fn().mockResolvedValue({ id: 20, sociedad_id: 18 }),
        countFacturasAsociadas: jest.fn().mockResolvedValue(0),
        deleteOrdenCompraById: jest.fn().mockResolvedValue({
          id: 20,
          nombre: '20',
          ruta_pdf: rutaPdf
        })
      }
    });

    await expect(allowed.useCases.deleteOrdenCompra({
      user,
      sociedadId: 18,
      ordenCompraId: 20
    })).resolves.toEqual({
      id: 20,
      nombre: '20',
      eliminado: true
    });
    expect(fs.existsSync(fullPath)).toBe(false);
  });

  test('updateEstadoManual exige jerarquia suficiente y actualiza estado normalizado', async () => {
    rolesRepo.getRoleById.mockResolvedValueOnce({ id: 5, nivel_jerarquia: 40 });
    const denied = createUseCases({ baseDir: tempBaseDir });

    await expect(denied.useCases.updateEstadoManual({
      user,
      sociedadId: 18,
      ordenCompraId: 20,
      estado: 'cerrada'
    })).rejects.toMatchObject({
      status: 403,
      message: 'Solo contabilidad jefe o superior puede cambiar estado manualmente'
    });

    rolesRepo.getRoleById.mockResolvedValueOnce({ id: 5, nivel_jerarquia: 80 });
    const allowed = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        getOrdenCompraByIdAndSociedad: jest.fn().mockResolvedValue({ id: 20, sociedad_id: 18 })
      }
    });

    await expect(allowed.useCases.updateEstadoManual({
      user,
      sociedadId: '18',
      ordenCompraId: '20',
      estado: ' CERRADA '
    })).resolves.toEqual({ id: 20, estado: 'cerrada' });

    expect(allowed.ordenesCompraRepo.updateOrdenCompraEstado).toHaveBeenCalledWith({
      id: 20,
      estado: 'cerrada'
    });
  });
});
