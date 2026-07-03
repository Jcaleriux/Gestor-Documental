describe('tramitesPago caratulas use cases', () => {
  const buildRepoMock = (overrides = {}) => ({
    getTramiteByIdForUpdate: jest.fn().mockResolvedValue({
      id: 4,
      sociedad_id: 10,
      estado: 'en_revision_tesoreria_1'
    }),
    getSociedadById: jest.fn().mockResolvedValue({
      id: 10,
      nombre_proyecto: 'BSP',
      razon_social: 'Bio San Pablo',
      cedula_juridica: '3-101-887961'
    }),
    listDocumentosByTramite: jest.fn().mockResolvedValue([
      {
        factura_id: 1001,
        proveedor_id: 77,
        proveedor_nombre: 'CONSTRUPLAZA SOCIEDAD ANONIMA',
        proveedor_identificacion: '3101289562',
        consecutivo: '00100001010000000589'
      }
    ]),
    getTramiteCaratulaByTramiteId: jest.fn().mockResolvedValue(null),
    listTramiteCaratulaProvidersByTramiteId: jest.fn().mockResolvedValue([]),
    listTramiteCaratulaProviderFacturasByTramiteId: jest.fn().mockResolvedValue([]),
    listTramiteCaratulaOrphansByTramiteId: jest.fn().mockResolvedValue([]),
    getTramiteCaratulaProviderByKeyForUpdate: jest.fn().mockResolvedValue(null),
    getTramiteCaratulaOrphanByIdForUpdate: jest.fn().mockResolvedValue(null),
    upsertTramiteCaratula: jest.fn().mockResolvedValue({
      id: 10,
      tramite_id: 4,
      nombre_archivo: '20.bsp crc.pdf',
      ruta_archivo: '',
      estado: 'pendiente',
      fecha_ejecucion: '2026-03-12',
      sociedad_nombre_raw: 'BIO SAN PABLO - S.A.',
      sociedad_identificacion_raw: '3-101-887961',
      moneda: 'CRC',
      total_paginas: 15,
      cargado_por: 'tesoreria@sendadocs.local',
      procesado_en: '2026-03-22T12:00:00.000Z',
      actualizado_en: '2026-03-22T12:00:00.000Z',
      parsed_payload: {
        version: 2,
        provider_groups_count: 1,
        orphan_groups_count: 0
      }
    }),
    upsertTramiteCaratulaProvider: jest.fn().mockImplementation(async (payload) => ({
      id: 21,
      ...payload
    })),
    replaceTramiteCaratulaProviderFacturas: jest.fn().mockResolvedValue(undefined),
    insertTramiteCaratulaOrphan: jest.fn().mockResolvedValue(undefined),
    updateTramiteCaratulaOrphanStatus: jest.fn().mockResolvedValue(undefined),
    deleteTramiteCaratulaProvidersByTramiteId: jest.fn().mockResolvedValue(undefined),
    deleteTramiteCaratulaOrphansByTramiteId: jest.fn().mockResolvedValue(undefined),
    insertHistorialTramite: jest.fn().mockResolvedValue(undefined),
    touchTramite: jest.fn().mockResolvedValue(undefined),
    ...overrides
  });

  const loadUseCases = ({
    summary = {
      caratula: {
        estado: 'requiere_revision'
      },
      provider_groups: [
        {
          provider_key: 'id:77',
          provider_caratula_id: 21
        }
      ],
      orphan_groups: [],
      warnings: []
    },
    splitResult
  } = {}) => {
    jest.resetModules();

    const supportMock = {
      buildDocumentsCatalog: jest.fn(),
      decodeCaratulaPdfBase64: jest.fn().mockReturnValue(Buffer.from('%PDF-demo')),
      parseTramiteCaratulaPdf: jest.fn().mockResolvedValue({
        execution_date: '2026-03-12',
        currency: 'CRC',
        total_pages: 15,
        society: {
          raw_name: 'BIO SAN PABLO - S.A.',
          raw_identification: '3-101-887961'
        },
        provider_groups: []
      }),
      applyManualResolutionToPayload: jest.fn((input) => ({
        ...input.payload,
        summary: {
          state: 'procesada'
        }
      }))
    };

    const providerSupportMock = {
      ATTACHMENT_STATUS: {
        SIN_CARATULA: 'sin_caratula',
        PENDIENTE_CONFIRMACION: 'pendiente_confirmacion',
        CONFIRMADA: 'confirmada'
      },
      ORDER_STATUS: {
        NO_REQUERIDO: 'no_requerido',
        PENDIENTE_CONFIRMACION: 'pendiente_confirmacion',
        CONFIRMADO: 'confirmado'
      },
      ORPHAN_STATUS: {
        PENDIENTE: 'pendiente',
        ASIGNADA: 'asignada',
        DESCARTADA: 'descartada'
      },
      summarizeStoredTramiteCaratulasV2: jest.fn().mockReturnValue(summary),
      splitBulkCaratulasPdf: jest.fn().mockResolvedValue(splitResult || {
        manifestPayload: {
          version: 2,
          execution_date: '2026-03-12',
          currency: 'CRC',
          provider_groups_count: 1,
          orphan_groups_count: 0
        },
        providerRows: [
          {
            provider_key: 'id:77',
            proveedor_id: 77,
            proveedor_nombre: 'CONSTRUPLAZA SOCIEDAD ANONIMA',
            proveedor_identificacion: '3101289562',
            provider_raw_name: 'CONSTRUPLAZA SOCIEDAD ANONIMA',
            provider_raw_identification: '3101289562',
            provider_code: null,
            nombre_archivo: '20.bsp_crc_CONSTRUPLAZA.pdf',
            ruta_archivo: 'documentos/tramites/caratulas/10/4/providers/20.bsp_crc_CONSTRUPLAZA.pdf',
            attachment_status: 'pendiente_confirmacion',
            attachment_origin: 'auto',
            order_status: 'no_requerido',
            execution_date: '2026-03-12',
            currency: 'CRC',
            page_start: 1,
            page_end: 1,
            page_numbers: [1],
            warnings: [],
            group_payload: {
              version: 2,
              page_numbers: [1],
              lines: []
            },
            order_confirmed_by: null,
            order_confirmed_at: null,
            attachment_confirmed_by: null,
            attachment_confirmed_at: null
          }
        ],
        providerOrderRows: [
          {
            provider_key: 'id:77',
            rows: [
              {
                factura_id: 1001,
                sort_index: 1,
                order_source: 'manual'
              }
            ]
          }
        ],
        orphanRows: [],
        savedPaths: ['documentos/tramites/caratulas/10/4/providers/20.bsp_crc_CONSTRUPLAZA.pdf']
      }),
      buildProviderUploadDraft: jest.fn(),
      buildProviderDraftFromAssignedOrphan: jest.fn(),
      buildOrderRows: jest.fn(),
      buildProviderOrderIds: jest.fn(() => [1001]),
      compareOrderedIds: jest.fn(),
      ensureProviderBelongsToCatalog: jest.fn(),
      applyManualResolutionToStoredGroup: jest.fn(),
      copyStoredCaratulaFile: jest.fn(),
      deleteStoredFiles: jest.fn()
    };

    jest.doMock('../services/tramitesPagoCaratulasSupport', () => supportMock);
    jest.doMock('../services/tramitesPagoCaratulasProviderSupport', () => providerSupportMock);

    const { createTramitesPagoCaratulasUseCases } = require('../services/tramitesPagoUseCases.caratulas');

    return {
      createTramitesPagoCaratulasUseCases,
      supportMock,
      providerSupportMock
    };
  };

  test('uploadCaratulas importa el lote y resume por proveedor', async () => {
    const { createTramitesPagoCaratulasUseCases, providerSupportMock } = loadUseCases();
    const repo = buildRepoMock({
      getTramiteCaratulaByTramiteId: jest.fn().mockResolvedValue(null),
      listTramiteCaratulaProviderFacturasByTramiteId: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            provider_caratula_id: 21,
            factura_id: 1001,
            sort_index: 1,
            order_source: 'manual'
          }
        ]),
      listTramiteCaratulaOrphansByTramiteId: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
    });
    const runInTransaction = jest.fn(async (handler) => handler({}));
    const useCases = createTramitesPagoCaratulasUseCases({
      tramitesPagoRepo: repo,
      runInTransaction,
      baseDir: 'C:/tmp'
    });

    const result = await useCases.uploadCaratulas({
      id: 4,
      filename: '20.bsp crc.pdf',
      file_base64: 'data:application/pdf;base64,JVBERi0=',
      usuario: 'tesoreria@sendadocs.local'
    });

    expect(result).toEqual({
      caratula: {
        estado: 'requiere_revision'
      },
      provider_groups: [
        {
          provider_key: 'id:77',
          provider_caratula_id: 21
        }
      ],
      orphan_groups: [],
      warnings: []
    });
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(repo.deleteTramiteCaratulaOrphansByTramiteId).toHaveBeenCalledWith(4, {});
    expect(repo.deleteTramiteCaratulaProvidersByTramiteId).toHaveBeenCalledWith(4, {});
    expect(
      repo.deleteTramiteCaratulaOrphansByTramiteId.mock.invocationCallOrder[0]
    ).toBeLessThan(repo.deleteTramiteCaratulaProvidersByTramiteId.mock.invocationCallOrder[0]);
    expect(repo.upsertTramiteCaratulaProvider).toHaveBeenCalledTimes(1);
    expect(repo.replaceTramiteCaratulaProviderFacturas).toHaveBeenCalledWith({
      providerCaratulaId: 21,
      rows: [
        {
          factura_id: 1001,
          sort_index: 1,
          order_source: 'manual'
        }
      ]
    }, {});
    expect(providerSupportMock.summarizeStoredTramiteCaratulasV2).toHaveBeenLastCalledWith({
      row: expect.objectContaining({
        id: 10,
        tramite_id: 4
      }),
      documents: [
        expect.objectContaining({
          factura_id: 1001,
          consecutivo: '00100001010000000589'
        })
      ],
      providerRows: [
        expect.objectContaining({
          id: 21,
          provider_key: 'id:77'
        })
      ],
      providerOrderRows: [
        expect.objectContaining({
          provider_caratula_id: 21,
          factura_id: 1001
        })
      ],
      orphanRows: [],
      tramiteEstado: 'en_revision_tesoreria_1'
    });
  });

  test('resolveCaratulas mantiene compatibilidad con payload legacy sin proveedores persistidos', async () => {
    const { createTramitesPagoCaratulasUseCases, supportMock, providerSupportMock } = loadUseCases({
      summary: {
        caratula: {
          estado: 'procesada'
        },
        provider_groups: [],
        orphan_groups: [],
        warnings: []
      }
    });
    const repo = buildRepoMock({
      getTramiteCaratulaByTramiteId: jest.fn().mockResolvedValue({
        id: 9,
        tramite_id: 4,
        nombre_archivo: 'anterior.pdf',
        ruta_archivo: 'documentos/tramites/caratulas/10/4/anterior.pdf',
        estado: 'pendiente',
        fecha_ejecucion: null,
        sociedad_nombre_raw: null,
        sociedad_identificacion_raw: null,
        moneda: 'CRC',
        total_paginas: 1,
        cargado_por: 'tester',
        procesado_en: '2026-03-22T00:00:00.000Z',
        actualizado_en: '2026-03-22T00:00:00.000Z',
        parsed_payload: {
          summary: {
            state: 'pendiente'
          }
        }
      }),
      upsertTramiteCaratula: jest.fn().mockResolvedValue({
        id: 10,
        tramite_id: 4,
        nombre_archivo: 'anterior.pdf',
        ruta_archivo: 'documentos/tramites/caratulas/10/4/anterior.pdf',
        estado: 'procesada',
        fecha_ejecucion: null,
        sociedad_nombre_raw: null,
        sociedad_identificacion_raw: null,
        moneda: 'CRC',
        total_paginas: 1,
        cargado_por: 'tester',
        procesado_en: '2026-03-22T12:00:00.000Z',
        actualizado_en: '2026-03-22T12:00:00.000Z',
        parsed_payload: {
          summary: {
            state: 'procesada'
          }
        }
      })
    });
    const runInTransaction = jest.fn(async (handler) => handler({}));
    const useCases = createTramitesPagoCaratulasUseCases({
      tramitesPagoRepo: repo,
      runInTransaction,
      baseDir: 'C:/tmp'
    });

    const result = await useCases.resolveCaratulas({
      id: 4,
      group_key: 'group_1_1_1',
      provider_factura_id: 1001,
      line_matches: [],
      usuario: 'tesoreria@sendadocs.local'
    });

    expect(result).toEqual({
      caratula: {
        estado: 'procesada'
      },
      provider_groups: [],
      orphan_groups: [],
      warnings: []
    });
    expect(supportMock.applyManualResolutionToPayload).toHaveBeenCalledTimes(1);
    expect(providerSupportMock.summarizeStoredTramiteCaratulasV2).toHaveBeenLastCalledWith({
      row: expect.objectContaining({
        id: 10,
        tramite_id: 4
      }),
      documents: [
        expect.objectContaining({
          factura_id: 1001
        })
      ],
      providerRows: [],
      providerOrderRows: [],
      orphanRows: [],
      tramiteEstado: 'en_revision_tesoreria_1'
    });
  });
});
