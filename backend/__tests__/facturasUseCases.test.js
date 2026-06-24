const { createFacturasUseCases } = require('../services/facturasUseCases');

const createRepoMock = (overrides = {}) => ({
  listFacturas: jest.fn().mockResolvedValue({
    items: [
      {
        id: 1,
        clave: '506123',
        consecutivo: '00100001010000000001',
        fecha_emision: '2026-03-01T00:00:00.000Z',
        emisor: { nombre: 'Proveedor QA' },
        receptor: { nombre: 'Novogar' },
        resumen: {
          CodigoTipoMoneda: { CodigoMoneda: 'CRC' },
          TotalComprobante: 1000,
        },
        estado: 'contabilizado',
        estado_documental: 'contabilizado',
        estado_workflow_pago: null,
        total_factura: 1000,
        total_rebajos: 0,
        retencion_total: 0,
        retencion_pagada: 0,
        retencion_pendiente: 0,
        total_a_pagar: 1000,
        total_pendiente_global: 1000,
        has_mensaje_hacienda: true,
        estado_hacienda: 'Aceptado',
        mensaje_hacienda: 1,
      },
    ],
    meta: {
      page: 1,
      pageSize: 50,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      sortBy: 'fecha_emision',
      sortDir: 'desc',
    },
    summary: {
      totalItems: 1,
      totalAmount: 1000,
      byEstado: [
        { estado: 'contabilizado', totalItems: 1, totalAmount: 1000 },
      ],
      byMoneda: [
        { moneda: 'CRC', totalItems: 1, totalAmount: 1000 },
      ],
    },
  }),
  listRetencionesPendientes: jest.fn().mockResolvedValue([]),
  getSociedadById: jest.fn().mockResolvedValue({
    id: 10,
    nombre_proyecto: 'BSP',
    razon_social: 'Bio San Pablo',
  }),
  listFacturasForPdfDownload: jest.fn().mockResolvedValue([]),
  getFacturaById: jest.fn().mockResolvedValue(null),
  getClaveByFacturaId: jest.fn().mockResolvedValue(null),
  getLatestMensajeHaciendaByFacturaId: jest.fn().mockResolvedValue(null),
  getLatestMensajeHaciendaByClave: jest.fn().mockResolvedValue(null),
  getNotaCreditoById: jest.fn().mockResolvedValue(null),
  listNotasCredito: jest.fn().mockResolvedValue({
    items: [],
    meta: {
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      sortBy: 'fecha_emision',
      sortDir: 'desc',
    },
    summary: {
      totalItems: 0,
      totalAmount: 0,
      totalSaldoDisponible: 0,
      byEstado: [],
      byMoneda: [],
    },
  }),
  listTiquetesElectronicos: jest.fn().mockResolvedValue({
    items: [],
    meta: {
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      sortBy: 'fecha_emision',
      sortDir: 'desc',
    },
    summary: {
      totalItems: 0,
      totalAmount: 0,
      byMoneda: [],
    },
  }),
  listMensajesHacienda: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('facturasUseCases', () => {
  test('listFacturas normaliza parametros y devuelve respuesta paginada', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    const result = await useCases.listFacturas({
      sociedadId: '10',
      search: ' Proveedor ',
      estado: 'contabilizado',
      emisor: ' QA ',
      moneda: 'crc',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      montoMin: '100',
      montoMax: '1000',
      sortBy: 'emisor',
      sortDir: 'asc',
      page: '2',
      pageSize: '100',
    });

    expect(repo.listFacturas).toHaveBeenCalledWith({
      sociedadId: 10,
      search: 'Proveedor',
      estado: 'contabilizado',
      emisor: 'QA',
      moneda: 'CRC',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      montoMin: 100,
      montoMax: 1000,
      dashboardPreset: null,
      sortBy: 'emisor',
      sortDir: 'asc',
      page: 2,
      pageSize: 100,
    });

    expect(result).toMatchObject({
      items: [
        {
          id: 1,
          estado: 'contabilizado',
          estado_documental: 'contabilizado',
          estado_workflow_pago: null,
          has_mensaje_hacienda: true,
          estado_hacienda: 'Aceptado',
          mensaje_hacienda: 1,
        },
      ],
      meta: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
        sortBy: 'fecha_emision',
        sortDir: 'desc',
      },
      summary: {
        totalItems: 1,
        totalAmount: 1000,
        byEstado: [
          { estado: 'contabilizado', totalItems: 1, totalAmount: 1000 },
        ],
        byMoneda: [
          { moneda: 'CRC', totalItems: 1, totalAmount: 1000 },
        ],
      },
    });
  });

  test('listFacturas preserva estado documental y workflow desacoplado', async () => {
    const repo = createRepoMock({
      listFacturas: jest.fn().mockResolvedValue({
        items: [
          {
            id: 3,
            clave: '506999',
            consecutivo: '00100001010000000003',
            fecha_emision: '2026-03-05T00:00:00.000Z',
            emisor: { nombre: 'Proveedor Workflow' },
            receptor: { nombre: 'Novogar' },
            resumen: {
              CodigoTipoMoneda: { CodigoMoneda: 'CRC' },
              TotalComprobante: 2000,
            },
            estado: 'en_tramite_pago',
            estado_documental: 'contabilizado',
            estado_workflow_pago: 'en_tramite_pago',
            total_factura: 2000,
            total_a_pagar: 2000,
            total_pendiente_global: 2000,
          },
        ],
        meta: {
          page: 1,
          pageSize: 50,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
          sortBy: 'fecha_emision',
          sortDir: 'desc',
        },
        summary: {
          totalItems: 1,
          totalAmount: 2000,
          byEstado: [
            { estado: 'en_tramite_pago', totalItems: 1, totalAmount: 2000 },
          ],
          byMoneda: [
            { moneda: 'CRC', totalItems: 1, totalAmount: 2000 },
          ],
        },
      }),
    });
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    const result = await useCases.listFacturas({ sociedadId: '10' });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 3,
        estado: 'en_tramite_pago',
        estado_documental: 'contabilizado',
        estado_workflow_pago: 'en_tramite_pago',
      }),
    ]);
  });

  test('listFacturas usa defaults cuando no se envian parametros opcionales', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await useCases.listFacturas({ sociedadId: '5' });

    expect(repo.listFacturas).toHaveBeenCalledWith({
      sociedadId: 5,
      search: null,
      estado: null,
      emisor: null,
      moneda: null,
      fechaDesde: null,
      fechaHasta: null,
      montoMin: null,
      montoMax: null,
      dashboardPreset: null,
      sortBy: 'fecha_emision',
      sortDir: 'desc',
      page: 1,
      pageSize: 50,
    });
  });

  test('getFacturasPdfSeleccionadas compone descarga con sello para facturas validas', async () => {
    const repo = createRepoMock({
      listFacturasForPdfDownload: jest.fn().mockResolvedValue([
        {
          id: 11,
          factura_id: 11,
          clave: '506111',
          consecutivo: '00100001010000000011',
          ruta_pdf: 'facturas/11.pdf',
          sociedad_id: 10,
          conta_fecha_contabilizacion: '2026-06-24',
          conta_asiento: '123',
          conta_centro_costo: '1101 - INSTALACION MECANICA',
          conta_creado_por: 'Auxiliar Contable',
        },
      ]),
    });
    const mergeUnifiedPdfResourcesImpl = jest.fn().mockResolvedValue({
      buffer: Buffer.from('pdf-unificado'),
      omittedItems: ['Factura omitida'],
    });
    const useCases = createFacturasUseCases({
      facturasRepo: repo,
      dependencies: {
        createFilesUseCasesImpl: () => ({
          getPdfFile: ({ rawPath }) => ({ fullPath: `C:/docs/${rawPath}` }),
        }),
        readFileImpl: jest.fn().mockResolvedValue(Buffer.from('pdf-source')),
        mergeUnifiedPdfResourcesImpl,
        buildOmittedItemsHeaderImpl: jest.fn(() => 'Factura omitida'),
      },
    });

    const result = await useCases.getFacturasPdfSeleccionadas({
      sociedadId: '10',
      facturaIds: ['11'],
    });

    expect(repo.getSociedadById).toHaveBeenCalledWith(10);
    expect(repo.listFacturasForPdfDownload).toHaveBeenCalledWith({
      ids: [11],
      sociedadId: 10,
    });
    expect(mergeUnifiedPdfResourcesImpl).toHaveBeenCalledWith({
      resources: [
        expect.objectContaining({
          key: 'factura-11-0',
          path: 'facturas/11.pdf',
          resourceType: 'factura_pdf',
          omissionLabel: 'Factura 00100001010000000011 - PDF factura',
          sidebarData: expect.objectContaining({
            consecutivo: '00100001010000000011',
            fields: expect.arrayContaining([
              expect.objectContaining({
                key: 'contabilizada_por',
                value: 'Auxiliar Contable',
              }),
            ]),
          }),
        }),
      ],
      loadResourceBuffer: expect.any(Function),
    });
    expect(result).toMatchObject({
      buffer: Buffer.from('pdf-unificado'),
      filename: 'facturas_10_seleccionadas.pdf',
      partialDownload: true,
      omittedCount: 1,
      omittedItemsHeader: 'Factura omitida',
    });
  });

  test('listFacturas acepta dashboardPreset pagadas y lo pasa al repositorio', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await useCases.listFacturas({
      sociedadId: '7',
      dashboardPreset: 'pagadas',
    });

    expect(repo.listFacturas).toHaveBeenCalledWith({
      sociedadId: 7,
      search: null,
      estado: null,
      emisor: null,
      moneda: null,
      fechaDesde: null,
      fechaHasta: null,
      montoMin: null,
      montoMax: null,
      dashboardPreset: 'pagadas',
      sortBy: 'fecha_emision',
      sortDir: 'desc',
      page: 1,
      pageSize: 50,
    });
  });

  test('listFacturas acepta dashboardPreset en_revision y en_tramite', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await useCases.listFacturas({
      sociedadId: '7',
      dashboardPreset: 'en_revision',
    });

    await useCases.listFacturas({
      sociedadId: '7',
      dashboardPreset: 'en_tramite',
    });

    expect(repo.listFacturas).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sociedadId: 7,
      dashboardPreset: 'en_revision',
    }));
    expect(repo.listFacturas).toHaveBeenNthCalledWith(2, expect.objectContaining({
      sociedadId: 7,
      dashboardPreset: 'en_tramite',
    }));
  });

  test('listFacturas acepta dashboardPreset contabilizadas y recibidas_ultimo_mes', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await useCases.listFacturas({
      sociedadId: '7',
      dashboardPreset: 'contabilizadas',
    });

    await useCases.listFacturas({
      sociedadId: '7',
      dashboardPreset: 'recibidas_ultimo_mes',
    });

    expect(repo.listFacturas).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sociedadId: 7,
      dashboardPreset: 'contabilizadas',
    }));
    expect(repo.listFacturas).toHaveBeenNthCalledWith(2, expect.objectContaining({
      sociedadId: 7,
      dashboardPreset: 'recibidas_ultimo_mes',
    }));
  });

  test('listFacturas acepta sortBy documento', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await useCases.listFacturas({
      sortBy: 'documento',
      sortDir: 'asc',
    });

    expect(repo.listFacturas).toHaveBeenCalledWith(expect.objectContaining({
      sortBy: 'documento',
      sortDir: 'asc',
    }));
  });

  test('listFacturas rechaza sortBy invalido', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await expect(useCases.listFacturas({ sortBy: 'proveedor' }))
      .rejects.toThrow('sortBy invalido');

    expect(repo.listFacturas).not.toHaveBeenCalled();
  });

  test('listFacturas rechaza rango de fechas invalido', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await expect(useCases.listFacturas({
      fechaDesde: '2026-04-01',
      fechaHasta: '2026-03-01',
    })).rejects.toThrow('fechaDesde no puede ser mayor que fechaHasta');

    expect(repo.listFacturas).not.toHaveBeenCalled();
  });

  test('listFacturas rechaza rango de monto invalido', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await expect(useCases.listFacturas({
      montoMin: '200',
      montoMax: '100',
    })).rejects.toThrow('montoMin no puede ser mayor que montoMax');

    expect(repo.listFacturas).not.toHaveBeenCalled();
  });

  test('listFacturas rechaza dashboardPreset invalido', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await expect(useCases.listFacturas({
      dashboardPreset: 'urgentes',
    })).rejects.toThrow('dashboardPreset invalido');

    expect(repo.listFacturas).not.toHaveBeenCalled();
  });

  test('listNotasCredito normaliza parametros y devuelve respuesta paginada con saldo', async () => {
    const repo = createRepoMock({
      listNotasCredito: jest.fn().mockResolvedValue({
        items: [
          {
            id: 15,
            clave: '5060001',
            numero_consecutivo: '00100002030000000015',
            fecha_emision: '2026-03-10T00:00:00.000Z',
            xml_completo: {
              Emisor: { Nombre: 'Proveedor NC' },
              ResumenNotaCredito: {
                CodigoTipoMoneda: { CodigoMoneda: 'CRC' },
                TotalComprobante: 1200,
              },
            },
            monto_total: 1200,
            total_aplicado: 300,
            saldo_disponible: 900,
            estado: 'disponible',
            moneda: 'CRC',
          },
        ],
        meta: {
          page: 2,
          pageSize: 25,
          totalItems: 3,
          totalPages: 1,
          hasNext: false,
          hasPrev: true,
          sortBy: 'monto',
          sortDir: 'asc',
        },
        summary: {
          totalItems: 3,
          totalAmount: 2400,
          totalSaldoDisponible: 900,
          byEstado: [
            {
              estado: 'disponible',
              totalItems: 2,
              totalAmount: 1800,
              totalSaldoDisponible: 900,
            },
          ],
          byMoneda: [
            {
              moneda: 'CRC',
              totalItems: 3,
              totalAmount: 2400,
              totalSaldoDisponible: 900,
            },
          ],
        },
      }),
    });
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    const result = await useCases.listNotasCredito({
      sociedadId: '10',
      proveedorId: '22',
      search: 'cornerstone',
      estado: 'Disponible',
      emisor: 'Proveedor',
      moneda: 'crc',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      montoMin: '100',
      montoMax: '5000',
      sortBy: 'monto',
      sortDir: 'asc',
      page: '2',
      pageSize: '25',
    });

    expect(repo.listNotasCredito).toHaveBeenCalledWith({
      sociedadId: 10,
      proveedorId: 22,
      search: 'cornerstone',
      estado: 'disponible',
      emisor: 'Proveedor',
      moneda: 'CRC',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      montoMin: 100,
      montoMax: 5000,
      sortBy: 'monto',
      sortDir: 'asc',
      page: 2,
      pageSize: 25,
    });

    expect(result).toMatchObject({
      items: [
        {
          id: 15,
          estado: 'disponible',
          total_aplicado: 300,
          saldo_disponible: 900,
        },
      ],
      meta: {
        page: 2,
        pageSize: 25,
        totalItems: 3,
        sortBy: 'monto',
        sortDir: 'asc',
      },
      summary: {
        totalItems: 3,
        totalAmount: 2400,
        totalSaldoDisponible: 900,
        byEstado: [
          {
            estado: 'disponible',
            totalItems: 2,
            totalAmount: 1800,
            totalSaldoDisponible: 900,
          },
        ],
      },
    });
  });

  test('listNotasCredito rechaza sortBy invalido', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await expect(useCases.listNotasCredito({ sortBy: 'clave' }))
      .rejects.toThrow('sortBy invalido');

    expect(repo.listNotasCredito).not.toHaveBeenCalled();
  });

  test('listTiquetesElectronicos normaliza parametros y devuelve respuesta paginada', async () => {
    const repo = createRepoMock({
      listTiquetesElectronicos: jest.fn().mockResolvedValue({
        items: [
          {
            id: 9,
            clave: '5060009',
            consecutivo: '00100001040000000009',
            fecha_emision: '2026-03-11T00:00:00.000Z',
            emisor: { nombre: 'Caja principal' },
            resumen: { TotalComprobante: 850, CodigoTipoMoneda: { CodigoMoneda: 'CRC' } },
            monto_total: 850,
            moneda: 'CRC',
          },
        ],
        meta: {
          page: 2,
          pageSize: 25,
          totalItems: 5,
          totalPages: 1,
          hasNext: false,
          hasPrev: true,
          sortBy: 'monto',
          sortDir: 'asc',
        },
        summary: {
          totalItems: 5,
          totalAmount: 2400,
          byMoneda: [
            { moneda: 'CRC', totalItems: 4, totalAmount: 2000 },
            { moneda: 'USD', totalItems: 1, totalAmount: 400 },
          ],
        },
      }),
    });
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    const result = await useCases.listTiquetesElectronicos({
      sociedadId: '10',
      search: ' caja ',
      emisor: ' principal ',
      moneda: 'crc',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      montoMin: '100',
      montoMax: '900',
      sortBy: 'monto',
      sortDir: 'asc',
      page: '2',
      pageSize: '25',
    });

    expect(repo.listTiquetesElectronicos).toHaveBeenCalledWith({
      sociedadId: 10,
      search: 'caja',
      emisor: 'principal',
      moneda: 'CRC',
      fechaDesde: '2026-03-01',
      fechaHasta: '2026-03-31',
      montoMin: 100,
      montoMax: 900,
      sortBy: 'monto',
      sortDir: 'asc',
      page: 2,
      pageSize: 25,
    });

    expect(result).toMatchObject({
      items: [
        {
          id: 9,
          monto_total: 850,
          moneda: 'CRC',
        },
      ],
      meta: {
        page: 2,
        pageSize: 25,
        totalItems: 5,
        sortBy: 'monto',
        sortDir: 'asc',
      },
      summary: {
        totalItems: 5,
        totalAmount: 2400,
        byMoneda: [
          { moneda: 'CRC', totalItems: 4, totalAmount: 2000 },
          { moneda: 'USD', totalItems: 1, totalAmount: 400 },
        ],
      },
    });
  });

  test('listTiquetesElectronicos rechaza sortBy invalido', async () => {
    const repo = createRepoMock();
    const useCases = createFacturasUseCases({ facturasRepo: repo });

    await expect(useCases.listTiquetesElectronicos({ sortBy: 'clave' }))
      .rejects.toThrow('sortBy invalido');

    expect(repo.listTiquetesElectronicos).not.toHaveBeenCalled();
  });
});
