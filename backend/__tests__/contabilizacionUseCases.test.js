const { createContabilizacionUseCases } = require('../services/contabilizacionUseCases');
const { FACTURA_ESTADOS } = require('../domain/facturas');

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
      usuario: 'qa'
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

  test('registrarPagoRetencion hace rollback cuando falla la aplicacion del pago', async () => {
    const expectedError = new Error('fallo aplicando retencion');
    const { repo, client } = createRepoMock({
      applyRetencionPago: jest.fn().mockRejectedValue(expectedError)
    });
    const useCases = createContabilizacionUseCases({ contabilizacionRepo: repo });

    await expect(useCases.registrarPagoRetencion({
      facturaId: 1,
      monto: 100,
      usuario: 'qa'
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
      usuario: 'qa'
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
      usuario: 'qa'
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
      usuario: 'qa'
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
