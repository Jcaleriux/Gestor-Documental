const fs = require('fs');
const os = require('os');
const path = require('path');
const { createTablasPagoUseCases } = require('../services/tablasPagoUseCases');

const user = {
  id: 99,
  email: 'admin@novogar.test',
  permissions: ['acceso_total']
};

const pdfBase64 = () => Buffer.from('%PDF-1.4\nTabla de pago\n%%EOF', 'ascii').toString('base64');

const createRepo = (overrides = {}) => ({
  listTablasPago: jest.fn().mockResolvedValue([]),
  createTablaPago: jest.fn(async (payload) => ({ id: 1, ...payload })),
  getTablaPagoByIdAndSociedad: jest.fn().mockResolvedValue(null),
  countFacturasAsociadas: jest.fn().mockResolvedValue(0),
  deleteTablaPagoById: jest.fn().mockResolvedValue(null),
  ...overrides
});

const createUseCases = ({ repoOverrides = {}, proveedoresOverrides = {}, baseDir } = {}) => {
  const tablasPagoRepo = createRepo(repoOverrides);
  const proveedoresRepo = {
    getProveedorByIdAndSociedad: jest.fn().mockResolvedValue({ id: 7, sociedad_id: 18 }),
    ...proveedoresOverrides
  };

  return {
    useCases: createTablasPagoUseCases({
      tablasPagoRepo,
      proveedoresRepo,
      baseDir
    }),
    tablasPagoRepo,
    proveedoresRepo
  };
};

describe('tablasPagoUseCases', () => {
  let tempBaseDir;
  let dateNowSpy;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novogar-tablas-pago-'));
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1710000000000);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    if (tempBaseDir && fs.existsSync(tempBaseDir)) {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  test('valida dependencias requeridas', () => {
    expect(() => createTablasPagoUseCases({})).toThrow('tablasPagoRepo requerido');
    expect(() => createTablasPagoUseCases({
      tablasPagoRepo: {},
      proveedoresRepo: {}
    })).toThrow('baseDir requerido');
  });

  test('lista tablas por sociedad y proveedor validando pertenencia', async () => {
    const { useCases, tablasPagoRepo, proveedoresRepo } = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        listTablasPago: jest.fn().mockResolvedValue([{ id: 1, proveedor_id: 7 }])
      }
    });

    await expect(useCases.listTablasPago({
      user,
      sociedadId: '18',
      proveedorId: '7'
    })).resolves.toEqual([{ id: 1, proveedor_id: 7 }]);

    expect(proveedoresRepo.getProveedorByIdAndSociedad).toHaveBeenCalledWith({
      id: 7,
      sociedadId: 18
    });
    expect(tablasPagoRepo.listTablasPago).toHaveBeenCalledWith({
      sociedadId: 18,
      proveedorId: 7
    });
  });

  test('crea tabla de pago guardando PDF bajo la sociedad y proveedor', async () => {
    const { useCases, tablasPagoRepo } = createUseCases({ baseDir: tempBaseDir });

    const result = await useCases.createTablaPago({
      user,
      sociedad_id: '18',
      proveedor_id: '7',
      nombre: ' Tabla marzo ',
      filename: 'tabla marzo.pdf',
      file_base64: `data:application/pdf;base64,${pdfBase64()}`,
      metadata: { lote: 'marzo' }
    });

    expect(tablasPagoRepo.createTablaPago).toHaveBeenCalledWith({
      sociedadId: 18,
      proveedorId: 7,
      nombre: 'Tabla marzo',
      rutaPdf: 'documentos/tablas_pago/18/7/1710000000000_tabla_marzo.pdf',
      creadoPor: 'admin@novogar.test',
      metadata: { lote: 'marzo' }
    });
    expect(result.rutaPdf).toBe('documentos/tablas_pago/18/7/1710000000000_tabla_marzo.pdf');
    expect(fs.existsSync(path.join(tempBaseDir, result.rutaPdf))).toBe(true);
  });

  test('rechaza proveedor fuera de sociedad y PDF invalido', async () => {
    const invalidProvider = createUseCases({
      baseDir: tempBaseDir,
      proveedoresOverrides: {
        getProveedorByIdAndSociedad: jest.fn().mockResolvedValue(null)
      }
    });

    await expect(invalidProvider.useCases.createTablaPago({
      user,
      sociedad_id: 18,
      proveedor_id: 7,
      filename: 'tabla.pdf',
      file_base64: pdfBase64()
    })).rejects.toMatchObject({
      status: 400,
      message: 'Proveedor invalido para la sociedad seleccionada'
    });
    expect(invalidProvider.tablasPagoRepo.createTablaPago).not.toHaveBeenCalled();

    const invalidPdf = createUseCases({ baseDir: tempBaseDir });
    await expect(invalidPdf.useCases.createTablaPago({
      user,
      sociedad_id: 18,
      proveedor_id: 7,
      filename: 'tabla.txt',
      file_base64: Buffer.from('no es pdf').toString('base64')
    })).rejects.toMatchObject({
      status: 400,
      message: 'El archivo no es un PDF valido'
    });
    expect(invalidPdf.tablasPagoRepo.createTablaPago).not.toHaveBeenCalled();
  });

  test('deleteTablaPago bloquea tablas asociadas a facturas', async () => {
    const { useCases, tablasPagoRepo } = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        getTablaPagoByIdAndSociedad: jest.fn().mockResolvedValue({ id: 12, sociedad_id: 18 }),
        countFacturasAsociadas: jest.fn().mockResolvedValue(2)
      }
    });

    await expect(useCases.deleteTablaPago({
      user,
      sociedadId: '18',
      tablaPagoId: '12'
    })).rejects.toMatchObject({
      status: 409,
      message: 'Tabla de pagos asociada a factura.'
    });

    expect(tablasPagoRepo.deleteTablaPagoById).not.toHaveBeenCalled();
  });

  test('deleteTablaPago elimina registro y archivo resuelto dentro del baseDir', async () => {
    const rutaPdf = 'documentos/tablas_pago/18/7/tabla.pdf';
    const fullPath = path.join(tempBaseDir, rutaPdf);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '%PDF-1.4');

    const { useCases, tablasPagoRepo } = createUseCases({
      baseDir: tempBaseDir,
      repoOverrides: {
        getTablaPagoByIdAndSociedad: jest.fn().mockResolvedValue({ id: 12, sociedad_id: 18 }),
        countFacturasAsociadas: jest.fn().mockResolvedValue(0),
        deleteTablaPagoById: jest.fn().mockResolvedValue({
          id: 12,
          nombre: 'Tabla marzo',
          ruta_pdf: rutaPdf
        })
      }
    });

    await expect(useCases.deleteTablaPago({
      user,
      sociedadId: 18,
      tablaPagoId: 12
    })).resolves.toEqual({
      id: 12,
      nombre: 'Tabla marzo',
      eliminado: true
    });

    expect(tablasPagoRepo.deleteTablaPagoById).toHaveBeenCalledWith(12);
    expect(fs.existsSync(fullPath)).toBe(false);
  });
});
