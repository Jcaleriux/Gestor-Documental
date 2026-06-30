const { createTramitesPagoReadUseCases } = require('../services/tramitesPagoUseCases.reads');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const fullAccessUser = { id: 1, permissions: ['acceso_total'] };
const assignedUser = { id: 2, permissions: ['sociedades_asignadas', 'documentos_ver'] };

const createRepoMock = (overrides = {}) => ({
  getTramiteById: jest.fn().mockResolvedValue({ id: 7, estado: 'en_revision_tesoreria_1', sociedad_id: 10 }),
  getSociedadById: jest.fn().mockResolvedValue({ id: 10, nombre_proyecto: 'BSP (Bio San Pablo)' }),
  listTramites: jest.fn().mockResolvedValue([]),
  getRetencionesDisponibles: jest.fn().mockResolvedValue([]),
  listDocumentosByTramite: jest.fn().mockResolvedValue([]),
  listRetencionesByTramite: jest.fn().mockResolvedValue([]),
  listHistorialByTramite: jest.fn().mockResolvedValue([]),
  getTramiteCaratulaByTramiteId: jest.fn().mockResolvedValue(null),
  listTramiteCaratulaProvidersByTramiteId: jest.fn().mockResolvedValue([]),
  listTramiteCaratulaProviderFacturasByTramiteId: jest.fn().mockResolvedValue([]),
  listTramiteCaratulaOrphansByTramiteId: jest.fn().mockResolvedValue([]),
  ...overrides
});

describe('createTramitesPagoReadUseCases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getTramitePdfUnificado valida providerSortDirection y compone la respuesta de descarga', async () => {
    const repo = createRepoMock();
    const createFilesUseCasesImpl = jest.fn(() => ({
      getPdfFile: jest.fn(({ rawPath }) => ({ fullPath: `C:/docs/${rawPath}` }))
    }));
    const buildUnifiedPdfResourcePlanImpl = jest.fn(() => ([
      { key: 'factura-1', path: 'facturas/1.pdf', omissionLabel: 'Factura F-001 - PDF factura' }
    ]));
    const readFileImpl = jest.fn().mockResolvedValue(Buffer.from('raw-pdf-buffer'));
    const mergeUnifiedPdfResourcesImpl = jest.fn().mockResolvedValue({
      buffer: Buffer.from('merged-pdf-buffer'),
      omittedItems: ['Factura F-001 - Tabla de pagos']
    });
    const buildOmittedItemsHeaderImpl = jest.fn(() => 'Factura F-001 - Tabla de pagos');
    const buildUnifiedPdfDownloadFilenameImpl = jest.fn(() => 'tramite_7_vista_unificada.pdf');
    const useCases = createTramitesPagoReadUseCases({
      tramitesPagoRepo: repo,
      baseDir: 'C:/storage',
      dependencies: {
        createFilesUseCasesImpl,
        buildUnifiedPdfResourcePlanImpl,
        readFileImpl,
        mergeUnifiedPdfResourcesImpl,
        buildOmittedItemsHeaderImpl,
        buildUnifiedPdfDownloadFilenameImpl
      }
    });

    const result = await useCases.getTramitePdfUnificado({
      id: '7',
      user: fullAccessUser,
      actorUserId: 55,
      actorRoleId: 9,
      providerSortDirection: 'desc'
    });

    expect(createFilesUseCasesImpl).toHaveBeenCalledWith({ baseDir: 'C:/storage' });
    expect(repo.listDocumentosByTramite).toHaveBeenCalledWith(7, null, { currentUserId: 55, currentUserRoleId: 9 });
    expect(repo.getSociedadById).toHaveBeenCalledWith(10);
    expect(buildUnifiedPdfResourcePlanImpl).toHaveBeenCalledWith({
      providerGroups: [],
      documents: [],
      society: { id: 10, nombre_proyecto: 'BSP (Bio San Pablo)' },
      direction: 'desc'
    });
    expect(mergeUnifiedPdfResourcesImpl).toHaveBeenCalledWith({
      resources: [{ key: 'factura-1', path: 'facturas/1.pdf', omissionLabel: 'Factura F-001 - PDF factura' }],
      loadResourceBuffer: expect.any(Function)
    });
    const { loadResourceBuffer } = mergeUnifiedPdfResourcesImpl.mock.calls[0][0];
    const loadedBuffer = await loadResourceBuffer({ path: 'facturas/1.pdf' });
    expect(readFileImpl).toHaveBeenCalledWith('C:/docs/facturas/1.pdf');
    expect(loadedBuffer).toEqual(Buffer.from('raw-pdf-buffer'));
    expect(buildOmittedItemsHeaderImpl).toHaveBeenCalledWith(['Factura F-001 - Tabla de pagos']);
    expect(result).toEqual({
      buffer: Buffer.from('merged-pdf-buffer'),
      filename: 'tramite_7_vista_unificada.pdf',
      partialDownload: true,
      omittedCount: 1,
      omittedItemsHeader: 'Factura F-001 - Tabla de pagos'
    });
  });

  test('getTramitePdfUnificado rechaza providerSortDirection invalido', async () => {
    const useCases = createTramitesPagoReadUseCases({
      tramitesPagoRepo: createRepoMock(),
      baseDir: 'C:/storage'
    });

    await expect(useCases.getTramitePdfUnificado({
      id: 7,
      providerSortDirection: 'sideways'
    })).rejects.toMatchObject({
      status: 400,
      message: 'providerSortDirection invalido'
    });
  });

  test('getTramitePdfUnificado falla cuando no queda ningun PDF valido', async () => {
    const useCases = createTramitesPagoReadUseCases({
      tramitesPagoRepo: createRepoMock(),
      baseDir: 'C:/storage',
      dependencies: {
        createFilesUseCasesImpl: () => ({
          getPdfFile: ({ rawPath }) => ({ fullPath: rawPath })
        }),
        buildUnifiedPdfResourcePlanImpl: () => ([{ key: 'factura-1', path: 'facturas/1.pdf' }]),
        readFileImpl: jest.fn().mockResolvedValue(Buffer.from('broken')),
        mergeUnifiedPdfResourcesImpl: jest.fn().mockResolvedValue({
          buffer: null,
          omittedItems: ['Factura F-001 - PDF factura']
        })
      }
    });

    await expect(useCases.getTramitePdfUnificado({
      id: 7,
      user: fullAccessUser,
      providerSortDirection: 'asc'
    })).rejects.toMatchObject({
      status: 404,
      message: 'No se encontraron PDFs validos para descargar en la vista unificada del tramite.'
    });
  });

  test('listTramites limita a sociedades asignadas cuando no se envia sociedadId', async () => {
    const repo = createRepoMock();
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([10, 20]);
    const useCases = createTramitesPagoReadUseCases({
      tramitesPagoRepo: repo,
      baseDir: 'C:/storage'
    });

    await useCases.listTramites({
      estado: 'EN_REVISION_TESORERIA_1',
      user: assignedUser
    });

    expect(usuariosSociedadesRepo.listSociedadIdsByUsuarioId).toHaveBeenCalledWith(2);
    expect(repo.listTramites).toHaveBeenCalledWith({
      sociedadIds: [10, 20],
      estado: 'en_revision_tesoreria_1',
    });
  });

  test('listTramites rechaza sociedad no asignada', async () => {
    const repo = createRepoMock();
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([10]);
    const useCases = createTramitesPagoReadUseCases({
      tramitesPagoRepo: repo,
      baseDir: 'C:/storage'
    });

    await expect(useCases.listTramites({
      sociedadId: '99',
      user: assignedUser,
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada',
    });

    expect(repo.listTramites).not.toHaveBeenCalled();
  });

  test('getHistorial rechaza tramite de sociedad no asignada', async () => {
    const repo = createRepoMock({
      getTramiteById: jest.fn().mockResolvedValue({
        id: 7,
        sociedad_id: 99,
        estado: 'en_revision_tesoreria_1',
      }),
    });
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([10]);
    const useCases = createTramitesPagoReadUseCases({
      tramitesPagoRepo: repo,
      baseDir: 'C:/storage'
    });

    await expect(useCases.getHistorial({
      id: '7',
      user: assignedUser,
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada',
    });

    expect(repo.listHistorialByTramite).not.toHaveBeenCalled();
  });
});
