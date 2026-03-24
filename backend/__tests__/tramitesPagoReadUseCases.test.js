const { createTramitesPagoReadUseCases } = require('../services/tramitesPagoUseCases.reads');

const createRepoMock = (overrides = {}) => ({
  getTramiteById: jest.fn().mockResolvedValue({ id: 7, estado: 'en_revision_tesoreria_1', sociedad_id: 10 }),
  getSociedadById: jest.fn().mockResolvedValue({ id: 10, nombre_proyecto: 'BSP (Bio San Pablo)' }),
  listDocumentosByTramite: jest.fn().mockResolvedValue([]),
  listRetencionesByTramite: jest.fn().mockResolvedValue([]),
  getTramiteCaratulaByTramiteId: jest.fn().mockResolvedValue(null),
  listTramiteCaratulaProvidersByTramiteId: jest.fn().mockResolvedValue([]),
  listTramiteCaratulaProviderFacturasByTramiteId: jest.fn().mockResolvedValue([]),
  listTramiteCaratulaOrphansByTramiteId: jest.fn().mockResolvedValue([]),
  ...overrides
});

describe('createTramitesPagoReadUseCases', () => {
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
      actorUserId: 55,
      providerSortDirection: 'desc'
    });

    expect(createFilesUseCasesImpl).toHaveBeenCalledWith({ baseDir: 'C:/storage' });
    expect(repo.listDocumentosByTramite).toHaveBeenCalledWith(7, null, { currentUserId: 55 });
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
      providerSortDirection: 'asc'
    })).rejects.toMatchObject({
      status: 404,
      message: 'No se encontraron PDFs validos para descargar en la vista unificada del tramite.'
    });
  });
});
