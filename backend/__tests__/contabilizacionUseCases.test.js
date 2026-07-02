const fs = require('fs');
const os = require('os');
const path = require('path');
const { createContabilizacionUseCases } = require('../services/contabilizacionUseCases');
const { FACTURA_ESTADOS } = require('../domain/facturas');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const fullAccessUser = { id: 1, permissions: ['acceso_total'] };
const assignedUser = { id: 2, permissions: ['sociedades_asignadas', 'documentos_contabilizar'] };

const createClientMock = () => ({
  query: jest.fn().mockResolvedValue({}),
  release: jest.fn()
});

const createRepoMock = (overrides = {}) => {
  const client = overrides.client || createClientMock();
  const repo = {
    getClient: jest.fn().mockResolvedValue(client),
    getContabilizacionByFacturaId: jest.fn().mockResolvedValue({
      factura_id: 1,
      retencion: 0,
      descuento: 0,
      anticipo_aplicado: 0,
      monto_nota_credito: 0,
      retencion_pagada: 0,
      retencion_pendiente: 0
    }),
    listDocumentosRespaldoByFacturaId: jest.fn().mockResolvedValue([]),
    listRetencionPagosByFacturaId: jest.fn().mockResolvedValue([]),
    getFacturaById: jest.fn().mockResolvedValue({
      id: 1,
      estado: FACTURA_ESTADOS.EN_REVISION,
      sociedad_id: 10,
      resumen: { CodigoTipoMoneda: { CodigoMoneda: 'CRC' } }
    }),
    getProveedorById: jest.fn().mockResolvedValue({
      id: 30,
      sociedad_id: 10,
      identificacion_numero: '3101122334'
    }),
    getProveedorBySociedadAndIdentificacion: jest.fn().mockResolvedValue(null),
    getTablaPagoById: jest.fn().mockResolvedValue({
      id: 20,
      sociedad_id: 10,
      proveedor_id: 30
    }),
    getOrdenCompraById: jest.fn().mockResolvedValue(null),
    getNotaCreditoById: jest.fn().mockResolvedValue(null),
    getContabilizacionRetencionByFacturaIdForUpdate: jest.fn().mockResolvedValue({
      id: 7,
      retencion: 100,
      retencion_pagada: 0
    }),
    normalizeRetencionStateByFacturaId: jest.fn().mockResolvedValue({}),
    upsertContabilizacion: jest.fn().mockResolvedValue({}),
    createDocumentoRespaldo: jest.fn().mockResolvedValue({
      id: 81,
      factura_id: 1,
      nombre_archivo: 'respaldo.pdf',
      ruta_pdf: 'documentos/contabilizacion_respaldo/10/1/respaldo.pdf'
    }),
    getDocumentoRespaldoById: jest.fn().mockResolvedValue(null),
    deleteDocumentoRespaldoById: jest.fn().mockResolvedValue(null),
    insertRetencionPago: jest.fn().mockResolvedValue({ id: 99 }),
    applyRetencionPago: jest.fn().mockResolvedValue({}),
    updateFacturaEstado: jest.fn().mockResolvedValue(undefined),
    insertEstadoDocumento: jest.fn().mockResolvedValue(undefined),
    refreshEstadoOrdenCompraById: jest.fn().mockResolvedValue(null),
    ...overrides
  };

  return { repo, client };
};

describe('contabilizacionUseCases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('valida contrato minimo del repositorio', () => {
    expect(() => createContabilizacionUseCases({ contabilizacionRepo: {} }))
      .toThrow('contabilizacionRepo incompleto');
  });

  test('upsertContabilizacion infiere proveedor desde tabla de pago cuando no llega proveedor_id', async () => {
    const { repo, client } = createRepoMock();
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await useCases.upsertContabilizacion({
      facturaId: 1,
      tabla_pago_id: 20,
      usuario: 'qa',
      user: fullAccessUser
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(repo.getTablaPagoById).toHaveBeenCalledWith(20, client);
    expect(repo.getProveedorById).toHaveBeenCalledWith(30, client);
    expect(repo.upsertContabilizacion).toHaveBeenCalledWith(expect.objectContaining({
      facturaId: 1,
      proveedor_id: 30,
      tabla_pago_id: 20,
      numero_proveedor: '3101122334'
    }), client);
    expect(repo.updateFacturaEstado).toHaveBeenCalledWith({
      facturaId: 1,
      estado: FACTURA_ESTADOS.CONTABILIZADO
    }, client);
  });

  test('getContabilizacion devuelve documentos de respaldo aunque no exista fila de contabilizacion', async () => {
    const { repo } = createRepoMock({
      getContabilizacionByFacturaId: jest.fn().mockResolvedValue(null),
      listDocumentosRespaldoByFacturaId: jest.fn().mockResolvedValue([
        {
          id: 91,
          factura_id: 1,
          nombre_archivo: 'respaldo_demo.pdf',
          ruta_pdf: 'documentos/contabilizacion_respaldo/10/1/respaldo_demo.pdf'
        }
      ])
    });
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await expect(useCases.getContabilizacion({
      facturaId: 1,
      user: fullAccessUser
    })).resolves.toMatchObject({
      factura_id: 1,
      documentos_respaldo: [
        {
          id: 91,
          nombre_archivo: 'respaldo_demo.pdf'
        }
      ],
      retencion_pagos: []
    });
    expect(repo.listRetencionPagosByFacturaId).not.toHaveBeenCalled();
  });

  test('getContabilizacion rechaza facturas fuera de sociedades asignadas', async () => {
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([99]);
    const { repo } = createRepoMock();
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await expect(useCases.getContabilizacion({
      facturaId: 1,
      user: assignedUser
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
    expect(repo.getContabilizacionByFacturaId).not.toHaveBeenCalled();
  });

  test('upsertContabilizacion rechaza facturas fuera de sociedades asignadas antes de escribir', async () => {
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([99]);
    const { repo, client } = createRepoMock();
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await expect(useCases.upsertContabilizacion({
      facturaId: 1,
      proveedor_id: 30,
      usuario: 'qa',
      user: assignedUser
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
    expect(repo.upsertContabilizacion).not.toHaveBeenCalled();
    expect(repo.updateFacturaEstado).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  test('uploadDocumentoRespaldo guarda archivo y registra el documento', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novogar-conta-docs-'));
    const { repo, client } = createRepoMock({
      createDocumentoRespaldo: jest.fn().mockImplementation(async (payload) => ({
        id: 81,
        factura_id: payload.facturaId,
        nombre_archivo: payload.nombreArchivo,
        ruta_pdf: payload.rutaPdf
      }))
    });
    const useCases = createContabilizacionUseCases({
      contabilizacionRepo: repo,
      baseDir: tempDir,
      maxDocumentoRespaldoMb: 1
    });

    try {
      const fileBase64 = `data:application/pdf;base64,${Buffer.from('%PDF-demo').toString('base64')}`;
      const created = await useCases.uploadDocumentoRespaldo({
        facturaId: 1,
        filename: 'Respaldo Final!!.pdf',
        file_base64: fileBase64,
        usuario: 'qa',
        user: fullAccessUser
      });

      const createdPayload = repo.createDocumentoRespaldo.mock.calls[0][0];
      const storedFilePath = path.join(tempDir, createdPayload.rutaPdf);

      expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(repo.createDocumentoRespaldo).toHaveBeenCalledWith(expect.objectContaining({
        facturaId: 1,
        creadoPor: 'qa',
        rutaPdf: expect.stringContaining('documentos/contabilizacion_respaldo/10/1/'),
        nombreArchivo: expect.stringMatching(/\.pdf$/)
      }), client);
      expect(fs.existsSync(storedFilePath)).toBe(true);
      expect(created).toMatchObject({
        id: 81,
        factura_id: 1,
        ruta_pdf: createdPayload.rutaPdf
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('deleteDocumentoRespaldo elimina el registro y el archivo asociado', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novogar-conta-docs-'));
    const relativePath = 'documentos/contabilizacion_respaldo/10/1/respaldo_demo.pdf';
    const storedFilePath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(storedFilePath), { recursive: true });
    fs.writeFileSync(storedFilePath, '%PDF-demo');

    const { repo } = createRepoMock({
      getDocumentoRespaldoById: jest.fn().mockResolvedValue({
        id: 55,
        factura_id: 1,
        nombre_archivo: 'respaldo_demo.pdf',
        ruta_pdf: relativePath
      }),
      deleteDocumentoRespaldoById: jest.fn().mockResolvedValue({
        id: 55,
        nombre_archivo: 'respaldo_demo.pdf',
        ruta_pdf: relativePath
      })
    });
    const useCases = createContabilizacionUseCases({
      contabilizacionRepo: repo,
      baseDir: tempDir
    });

    try {
      await expect(useCases.deleteDocumentoRespaldo({
        facturaId: 1,
        documentoId: 55,
        user: fullAccessUser
      })).resolves.toEqual({
        id: 55,
        nombre_archivo: 'respaldo_demo.pdf',
        eliminado: true
      });
      expect(repo.getDocumentoRespaldoById).toHaveBeenCalledWith({
        facturaId: 1,
        documentoId: 55
      }, expect.anything());
      expect(repo.deleteDocumentoRespaldoById).toHaveBeenCalledWith(55, expect.anything());
      expect(fs.existsSync(storedFilePath)).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('registrarPagoRetencion hace rollback cuando falla la aplicacion del pago', async () => {
    const expectedError = new Error('fallo aplicando retencion');
    const { repo, client } = createRepoMock({
      applyRetencionPago: jest.fn().mockRejectedValue(expectedError)
    });
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await expect(useCases.registrarPagoRetencion({
      facturaId: 1,
      monto: 100,
      usuario: 'qa',
      user: fullAccessUser
    })).rejects.toThrow('fallo aplicando retencion');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test('upsertContabilizacion recalcula estado de orden de compra asociada', async () => {
    const { repo } = createRepoMock({
      getOrdenCompraById: jest.fn().mockResolvedValue({
        id: 40,
        sociedad_id: 10,
        proveedor_id: 30,
        moneda: 'CRC',
        estado: 'abierta',
        nombre: 'OC-40'
      }),
      getContabilizacionByFacturaId: jest
        .fn()
        .mockResolvedValueOnce({
          factura_id: 1,
          orden_compra_id: null
        })
        .mockResolvedValue({
          factura_id: 1,
          orden_compra_id: 40,
          retencion: 0,
          descuento: 0,
          anticipo_aplicado: 0,
          monto_nota_credito: 0,
          retencion_pagada: 0,
          retencion_pendiente: 0
        })
    });
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await useCases.upsertContabilizacion({
      facturaId: 1,
      proveedor_id: 30,
      orden_compra_id: 40,
      usuario: 'qa',
      user: fullAccessUser
    });

    expect(repo.refreshEstadoOrdenCompraById).toHaveBeenCalledWith(40, expect.anything());
    expect(repo.upsertContabilizacion).toHaveBeenCalledWith(expect.objectContaining({
      orden_compra_id: 40,
      orden_compra: 'OC-40'
    }), expect.anything());
  });

  test('upsertContabilizacion guarda borrador en en_revision', async () => {
    const { repo } = createRepoMock({
      getFacturaById: jest.fn().mockResolvedValue({
        id: 1,
        estado: FACTURA_ESTADOS.NO_CONTABILIZADO,
        sociedad_id: 10,
        resumen: { CodigoTipoMoneda: { CodigoMoneda: 'CRC' } }
      })
    });
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await useCases.upsertContabilizacion({
      facturaId: 1,
      proveedor_id: 30,
      workflow_action: 'save_draft',
      usuario: 'qa',
      user: fullAccessUser
    });

    expect(repo.updateFacturaEstado).toHaveBeenCalledWith({
      facturaId: 1,
      estado: FACTURA_ESTADOS.EN_REVISION
    }, expect.anything());
    expect(repo.insertEstadoDocumento).toHaveBeenCalledWith({
      facturaId: 1,
      estadoAnterior: FACTURA_ESTADOS.NO_CONTABILIZADO,
      estadoNuevo: FACTURA_ESTADOS.EN_REVISION,
      usuario: 'qa',
      motivo: 'Borrador de contabilizacion'
    }, expect.anything());
  });

  test('upsertContabilizacion mark_in_review persiste y mueve a en_revision', async () => {
    const { repo } = createRepoMock({
      getFacturaById: jest.fn().mockResolvedValue({
        id: 1,
        estado: FACTURA_ESTADOS.CONTABILIZADO,
        sociedad_id: 10,
        resumen: { CodigoTipoMoneda: { CodigoMoneda: 'CRC' } }
      })
    });
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await useCases.upsertContabilizacion({
      facturaId: 1,
      proveedor_id: 30,
      workflow_action: 'mark_in_review',
      usuario: 'qa',
      user: fullAccessUser
    });

    expect(repo.updateFacturaEstado).toHaveBeenCalledWith({
      facturaId: 1,
      estado: FACTURA_ESTADOS.EN_REVISION
    }, expect.anything());
    expect(repo.insertEstadoDocumento).toHaveBeenCalledWith({
      facturaId: 1,
      estadoAnterior: FACTURA_ESTADOS.CONTABILIZADO,
      estadoNuevo: FACTURA_ESTADOS.EN_REVISION,
      usuario: 'qa',
      motivo: 'Contabilizacion en revision'
    }, expect.anything());
  });
});
