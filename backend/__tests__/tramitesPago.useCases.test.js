const { createTramitesPagoUseCases } = require('../services/tramitesPagoUseCases');
const { TRAMITE_ESTADOS, DOCUMENTO_DECISIONES } = require('../domain/tramitesPago');
const { FACTURA_ESTADOS } = require('../domain/facturas');

const createClientMock = () => ({
  query: jest.fn().mockResolvedValue({}),
  release: jest.fn()
});

const createRepoMock = (overrides = {}) => {
  const client = overrides.client || createClientMock();
  const repo = {
    getClient: jest.fn().mockResolvedValue(client),
    getTramiteEstado: jest.fn().mockResolvedValue({ estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA }),
    getTramiteById: jest.fn().mockResolvedValue({ id: 1, estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA }),
    getFacturaEstado: jest.fn().mockResolvedValue({ estado: FACTURA_ESTADOS.EN_REVISION }),
    getDocumentoTesoreriaEstado: jest.fn().mockResolvedValue({ estado_tesoreria: 'pendiente' }),
    updateDocumentoTesoreriaExcluido: jest.fn().mockResolvedValue({ factura_id: 2 }),
    updateDocumentoTesoreriaReset: jest.fn().mockResolvedValue({ factura_id: 2 }),
    updateDocumentoTesoreriaPendiente: jest.fn().mockResolvedValue(undefined),
    updateDocumentoDecision: jest.fn().mockResolvedValue({ factura_id: 2 }),
    updateFacturaEstado: jest.fn().mockResolvedValue(undefined),
    updateFacturasEstadoByIds: jest.fn().mockResolvedValue(undefined),
    updateFacturasEstadoPorSaldoByTramite: jest.fn().mockResolvedValue([]),
    updateTramiteEstado: jest.fn().mockResolvedValue({ id: 1 }),
    insertHistorialDocumentoConEstados: jest.fn().mockResolvedValue(undefined),
    insertHistorialConEstados: jest.fn().mockResolvedValue(undefined),
    insertHistorialDocumento: jest.fn().mockResolvedValue(undefined),
    insertHistorialTramite: jest.fn().mockResolvedValue(undefined),
    insertPagoFactura: jest.fn().mockResolvedValue(undefined),
    touchTramite: jest.fn().mockResolvedValue(undefined),
    listTramites: jest.fn().mockResolvedValue([]),
    getRetencionesDisponibles: jest.fn().mockResolvedValue([]),
    listDocumentosByTramite: jest.fn().mockResolvedValue([]),
    listRetencionesByTramite: jest.fn().mockResolvedValue([]),
    listHistorialByTramite: jest.fn().mockResolvedValue([]),
    getFacturasByIds: jest.fn().mockResolvedValue([]),
    getRetencionesPendientesByFacturaIds: jest.fn().mockResolvedValue([]),
    findDuplicadosActivos: jest.fn().mockResolvedValue([]),
    findRetencionesDuplicadasActivas: jest.fn().mockResolvedValue([]),
    insertTramite: jest.fn().mockResolvedValue({ id: 1, estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA }),
    insertTramiteDocumentos: jest.fn().mockResolvedValue(undefined),
    insertTramiteRetenciones: jest.fn().mockResolvedValue(undefined),
    countRechazadosActivos: jest.fn().mockResolvedValue(0),
    listSaldosPagoPrincipalByTramite: jest.fn().mockResolvedValue([]),
    applyRetencionesPagadasByTramite: jest.fn().mockResolvedValue({ pagos_registrados: 0, monto_total: 0 }),
    ...overrides
  };

  return { repo, client };
};

describe('tramitesPagoUseCases', () => {
  test('valida contrato minimo del repositorio', () => {
    expect(() => createTramitesPagoUseCases({ tramitesPagoRepo: {} }))
      .toThrow('tramitesPagoRepo incompleto');
  });

  test('rechazoTesoreria ejecuta cambios en una sola transaccion', async () => {
    const { repo, client } = createRepoMock();
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    const result = await useCases.rechazoTesoreria({
      id: 1,
      facturaId: 2,
      motivo: 'fuera de tramite',
      usuario: 'qa'
    });

    expect(result).toMatchObject({ factura_id: 2 });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();

    expect(repo.getTramiteEstado).toHaveBeenCalledWith(1, client);
    expect(repo.getFacturaEstado).toHaveBeenCalledWith(2, client);
    expect(repo.updateDocumentoTesoreriaExcluido).toHaveBeenCalledWith({
      tramiteId: 1,
      facturaId: 2,
      motivo: 'fuera de tramite'
    }, client);
    expect(repo.updateFacturaEstado).toHaveBeenCalledWith({
      facturaId: 2,
      estado: FACTURA_ESTADOS.EN_REVISION
    }, client);
    expect(repo.touchTramite).toHaveBeenCalledWith(1, client);
  });

  test('decisionDocumento hace rollback cuando una actualizacion falla', async () => {
    const error = new Error('fallo al actualizar tramite');
    const { repo, client } = createRepoMock({
      updateTramiteEstado: jest.fn().mockRejectedValue(error)
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await expect(useCases.decisionDocumento({
      id: 1,
      facturaId: 2,
      etapa: 'gerencia',
      decision: DOCUMENTO_DECISIONES.RECHAZADO,
      motivo: 'rechazo qa',
      usuario: 'qa'
    })).rejects.toThrow('fallo al actualizar tramite');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test('accionTesoreria normaliza accion y destino antes de ejecutar', async () => {
    const { repo, client } = createRepoMock();
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    const result = await useCases.accionTesoreria({
      id: '1',
      facturaId: '2',
      accion: 'REENVIAR',
      destino: 'EN_APROBACION_GERENCIA',
      motivo: 'reenvio por prueba',
      usuario: 'qa'
    });

    expect(result).toMatchObject({ factura_id: 2 });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(repo.getDocumentoTesoreriaEstado).toHaveBeenCalledWith(1, 2, client);
    expect(repo.updateDocumentoTesoreriaReset).toHaveBeenCalledWith(expect.objectContaining({
      destino: 'en_aprobacion_gerencia',
      tramiteId: 1,
      facturaId: 2
    }), client);
  });

  test('cambiarEstado retorna 400 con id invalido sin abrir transaccion', async () => {
    const { repo } = createRepoMock();
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await expect(useCases.cambiarEstado({
      id: 'abc',
      estado: TRAMITE_ESTADOS.PAGADO,
      usuario: 'qa'
    })).rejects.toThrow('id invalido');

    expect(repo.getClient).not.toHaveBeenCalled();
  });

  test('crearTramite integra facturas y retenciones con politicas de creacion', async () => {
    const { repo, client } = createRepoMock({
      getFacturasByIds: jest.fn().mockResolvedValue([
        { id: 11, sociedad_id: 10, estado: FACTURA_ESTADOS.CONTABILIZADO },
        { id: 12, sociedad_id: 10, estado: FACTURA_ESTADOS.PAGADO_PARCIALMENTE }
      ]),
      getRetencionesPendientesByFacturaIds: jest.fn().mockResolvedValue([
        { id: 21, sociedad_id: 10, proveedor_id: 30, monto_retencion_pendiente: 55.5 }
      ])
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    const result = await useCases.crearTramite({
      factura_ids: [11, 12],
      retencion_factura_ids: [21],
      usuario: 'qa'
    });

    expect(result).toMatchObject({ id: 1 });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();

    expect(repo.getFacturasByIds).toHaveBeenCalledWith([11, 12], client);
    expect(repo.getRetencionesPendientesByFacturaIds).toHaveBeenCalledWith([21], client);
    expect(repo.findDuplicadosActivos).toHaveBeenCalledWith([11, 12], client);
    expect(repo.findRetencionesDuplicadasActivas).toHaveBeenCalledWith([21], client);
    expect(repo.insertTramite).toHaveBeenCalledWith(expect.objectContaining({
      sociedadId: 10,
      estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA,
      creadoPor: 'qa'
    }), client);
    expect(repo.insertTramiteDocumentos).toHaveBeenCalledWith({
      tramiteId: 1,
      facturaIds: [11, 12]
    }, client);
    expect(repo.insertTramiteRetenciones).toHaveBeenCalledWith({
      tramiteId: 1,
      retenciones: [
        {
          facturaId: 21,
          proveedorId: 30,
          montoRetencion: 55.5
        }
      ]
    }, client);
  });

  test('crearTramite rechaza facturas en revision contable', async () => {
    const { repo } = createRepoMock({
      getFacturasByIds: jest.fn().mockResolvedValue([
        { id: 11, sociedad_id: 10, estado: FACTURA_ESTADOS.EN_REVISION }
      ])
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await expect(useCases.crearTramite({
      factura_ids: [11],
      usuario: 'qa'
    })).rejects.toThrow('Solo se pueden tramitar facturas contabilizadas o con pago parcial');
  });
});
