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
    getSociedadById: jest.fn().mockResolvedValue({
      id: 10,
      nombre_proyecto: 'Esencia Desamparados',
      razon_social: 'Esencia Desamparados S.A.',
      cedula_juridica: '3-101-877955'
    }),
    getTramiteByIdForUpdate: jest.fn().mockResolvedValue({ id: 1, estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA }),
    getTramiteCaratulaByTramiteId: jest.fn().mockResolvedValue(null),
    upsertTramiteCaratula: jest.fn().mockResolvedValue(null),
    getFacturaEstado: jest.fn().mockResolvedValue({ estado: FACTURA_ESTADOS.EN_REVISION }),
    getDocumentoTesoreriaEstado: jest.fn().mockResolvedValue({ estado_tesoreria: 'pendiente' }),
    getTramiteDocumentoByFacturaIdForUpdate: jest.fn().mockResolvedValue({
      tramite_id: 1,
      factura_id: 2,
      estado_factura_origen: FACTURA_ESTADOS.CONTABILIZADO,
      estado_gerencia: 'pendiente',
      estado_gerencia_contable: 'pendiente',
      estado_financiero: 'pendiente'
    }),
    updateDocumentoTesoreriaExcluido: jest.fn().mockResolvedValue({ factura_id: 2 }),
    updateDocumentoTesoreriaReset: jest.fn().mockResolvedValue({ factura_id: 2 }),
    updateDocumentoTesoreriaPendiente: jest.fn().mockResolvedValue(undefined),
    updateDocumentosTesoreriaEstadoByTramite: jest.fn().mockResolvedValue(undefined),
    updateRetencionesTesoreriaEstadoByTramite: jest.fn().mockResolvedValue(undefined),
    updateDocumentoDecision: jest.fn().mockResolvedValue({ factura_id: 2 }),
    listCentroCostoAprobadoresByFacturaIds: jest.fn().mockResolvedValue([]),
    insertTramiteDocumentoAprobadores: jest.fn().mockResolvedValue(undefined),
    listTramiteDocumentoAprobadores: jest.fn().mockResolvedValue([]),
    listTramiteDocumentoAprobadoresForUpdate: jest.fn().mockResolvedValue([]),
    updateTramiteDocumentoAprobadorEstado: jest.fn().mockResolvedValue({ factura_id: 2, usuario_aprobador_id: 101 }),
    resetTramiteDocumentoAprobadores: jest.fn().mockResolvedValue(undefined),
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
    getResumenEtapaDocumentos: jest.fn().mockResolvedValue({
      total_activos: 1,
      aprobados: 1,
      pendientes: 0,
      rechazados: 0
    }),
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
      estado: FACTURA_ESTADOS.CONTABILIZADO
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
      usuario: 'qa',
      actorPermissions: ['documentos_aprobar_gerencia']
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

  test('accionTesoreria devolver a contabilidad manda la factura a revision contable', async () => {
    const { repo, client } = createRepoMock({
      getTramiteEstado: jest.fn().mockResolvedValue({ estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA }),
      getFacturaEstado: jest.fn().mockResolvedValue({ estado: FACTURA_ESTADOS.EN_TRAMITE_PAGO })
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    const result = await useCases.accionTesoreria({
      id: 1,
      facturaId: 2,
      accion: 'devolver_contabilidad',
      motivo: 'corregir contabilizacion',
      usuario: 'tesoreria@novogar.local'
    });

    expect(result).toMatchObject({ factura_id: 2 });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(repo.getTramiteDocumentoByFacturaIdForUpdate).toHaveBeenCalledWith({
      tramiteId: 1,
      facturaId: 2
    }, client);
    expect(repo.updateDocumentoTesoreriaExcluido).toHaveBeenCalledWith({
      tramiteId: 1,
      facturaId: 2,
      motivo: 'corregir contabilizacion',
      estadoTesoreria: 'devuelto_contabilidad'
    }, client);
    expect(repo.updateFacturaEstado).toHaveBeenCalledWith({
      facturaId: 2,
      estado: FACTURA_ESTADOS.EN_REVISION
    }, client);
    expect(repo.touchTramite).toHaveBeenCalledWith(1, client);
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

  test('cambiarEstado envia a tesoreria para pago despues de financiera', async () => {
    const { repo, client } = createRepoMock({
      getTramiteById: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA
      }),
      updateTramiteEstado: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2
      })
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    const result = await useCases.cambiarEstado({
      id: 1,
      estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2,
      usuario: 'financiera@novogar.local',
      actorPermissions: ['documentos_aprobar_gerencia_financiera']
    });

    expect(result).toMatchObject({
      id: 1,
      estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2
    });
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(repo.updateTramiteEstado).toHaveBeenCalledWith({
      tramiteId: 1,
      estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2
    }, client);
  });

  test('cambiarEstado a gerencia contable exige caratulas resueltas en revision tesoreria inicial', async () => {
    const { repo, client } = createRepoMock({
      getTramiteById: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_1
      }),
      getTramiteCaratulaByTramiteId: jest.fn().mockResolvedValue(null)
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await expect(useCases.cambiarEstado({
      id: 1,
      estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE,
      usuario: 'tesoreria@novogar.local',
      actorPermissions: ['documentos_tramitar_pago']
    })).rejects.toThrow('Debe cargar las caratulas del tramite antes de continuar');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(repo.updateTramiteEstado).not.toHaveBeenCalled();
  });

  test('cambiarEstado a pagado exige permiso de tesoreria', async () => {
    const { repo, client } = createRepoMock({
      getTramiteById: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2
      })
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await expect(useCases.cambiarEstado({
      id: 1,
      estado: TRAMITE_ESTADOS.PAGADO,
      usuario: 'financiera@novogar.local',
      actorPermissions: ['documentos_aprobar_gerencia_financiera']
    })).rejects.toThrow('Permiso requerido: documentos_tramitar_pago');

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(repo.updateTramiteEstado).not.toHaveBeenCalled();
  });

  test('cambiarEstado a pagado marca tesoreria como pagada en documentos y retenciones', async () => {
    const { repo, client } = createRepoMock({
      getTramiteById: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2
      }),
      updateTramiteEstado: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.PAGADO
      }),
      listSaldosPagoPrincipalByTramite: jest.fn().mockResolvedValue([
        { factura_id: 2, saldo_pago_principal: 100 }
      ]),
      updateFacturasEstadoPorSaldoByTramite: jest.fn().mockResolvedValue([
        { id: 2, estado_anterior: FACTURA_ESTADOS.EN_TRAMITE_PAGO, estado_nuevo: FACTURA_ESTADOS.PAGADO }
      ])
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await useCases.cambiarEstado({
      id: 1,
      estado: TRAMITE_ESTADOS.PAGADO,
      usuario: 'tesoreria@novogar.local',
      actorPermissions: ['documentos_tramitar_pago']
    });

    expect(repo.updateDocumentosTesoreriaEstadoByTramite).toHaveBeenCalledWith({
      tramiteId: 1,
      estadoTesoreria: 'pagado'
    }, client);
    expect(repo.updateRetencionesTesoreriaEstadoByTramite).toHaveBeenCalledWith({
      tramiteId: 1,
      estadoTesoreria: 'pagado'
    }, client);
    expect(repo.insertHistorialDocumentoConEstados).toHaveBeenCalledWith({
      tramiteId: 1,
      facturaId: 2,
      accion: 'cambiar_estado',
      estadoAnterior: FACTURA_ESTADOS.EN_TRAMITE_PAGO,
      estadoNuevo: FACTURA_ESTADOS.PAGADO,
      usuario: 'tesoreria@novogar.local',
      motivo: null
    }, client);
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
      facturaEntries: [
        {
          facturaId: 11,
          estadoFacturaOrigen: FACTURA_ESTADOS.CONTABILIZADO
        },
        {
          facturaId: 12,
          estadoFacturaOrigen: FACTURA_ESTADOS.PAGADO_PARCIALMENTE
        }
      ]
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

  test('decisionDocumento rechazado en gerencia no cambia la factura a en_revision', async () => {
    const { repo, client } = createRepoMock({
      getTramiteEstado: jest.fn().mockResolvedValue({ estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA }),
      getTramiteByIdForUpdate: jest.fn().mockResolvedValue({ id: 1, estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA })
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await useCases.decisionDocumento({
      id: 1,
      facturaId: 2,
      etapa: 'gerencia',
      decision: DOCUMENTO_DECISIONES.RECHAZADO,
      motivo: 'rechazo de negocio',
      usuario: 'gerencia@novogar.local',
      actorPermissions: ['documentos_aprobar_gerencia']
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(repo.updateFacturaEstado).not.toHaveBeenCalled();
    expect(repo.updateDocumentoTesoreriaPendiente).toHaveBeenCalledWith({
      tramiteId: 1,
      facturaId: 2
    }, client);
    expect(repo.updateTramiteEstado).toHaveBeenCalledWith({
      tramiteId: 1,
      estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA
    }, client);
  });

  test('decisionDocumento aprobado en gerencia avanza el tramite a revision tesoreria inicial', async () => {
    const { repo, client } = createRepoMock({
      getTramiteByIdForUpdate: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA
      }),
      updateDocumentoDecision: jest.fn().mockResolvedValue({
        factura_id: 2,
        estado_gerencia: 'aprobado'
      }),
      updateTramiteEstado: jest.fn().mockResolvedValue({
        id: 1,
        estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_1
      })
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await useCases.decisionDocumento({
      id: 1,
      facturaId: 2,
      etapa: 'gerencia',
      decision: DOCUMENTO_DECISIONES.APROBADO,
      motivo: null,
      usuario: 'gerencia@novogar.local',
      actorPermissions: ['documentos_aprobar_gerencia']
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(repo.updateTramiteEstado).toHaveBeenCalledWith({
      tramiteId: 1,
      estado: TRAMITE_ESTADOS.EN_REVISION_TESORERIA_1
    }, client);
  });

  test('decisionDocumento permite aprobacion de gerencia por aprobador asignado y espera al resto', async () => {
    const pendingApprovalRows = [
      {
        factura_id: 2,
        usuario_aprobador_id: 101,
        estado_gerencia: 'pendiente'
      },
      {
        factura_id: 2,
        usuario_aprobador_id: 202,
        estado_gerencia: 'pendiente'
      }
    ];
    const afterActorApprovalRows = [
      {
        factura_id: 2,
        usuario_aprobador_id: 101,
        estado_gerencia: 'aprobado'
      },
      {
        factura_id: 2,
        usuario_aprobador_id: 202,
        estado_gerencia: 'pendiente'
      }
    ];
    const listTramiteDocumentoAprobadores = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(pendingApprovalRows)
      .mockResolvedValueOnce(pendingApprovalRows)
      .mockResolvedValueOnce(afterActorApprovalRows);

    const { repo } = createRepoMock({
      listCentroCostoAprobadoresByFacturaIds: jest.fn().mockResolvedValue([
        { factura_id: 2, usuario_aprobador_id: 101, usuario_aprobador_nombre: 'Gerencia 1', usuario_aprobador_email: 'g1@novogar.local' },
        { factura_id: 2, usuario_aprobador_id: 202, usuario_aprobador_nombre: 'Gerencia 2', usuario_aprobador_email: 'g2@novogar.local' }
      ]),
      listTramiteDocumentoAprobadores,
      listTramiteDocumentoAprobadoresForUpdate: jest.fn().mockResolvedValue(pendingApprovalRows)
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    const result = await useCases.decisionDocumento({
      id: 1,
      facturaId: 2,
      etapa: 'gerencia',
      decision: DOCUMENTO_DECISIONES.APROBADO,
      motivo: null,
      usuario: 'gerencia@novogar.local',
      actorUserId: 101,
      actorPermissions: ['documentos_ver']
    });

    expect(result).toMatchObject({ factura_id: 2, estado_gerencia: 'pendiente' });
    expect(repo.updateTramiteDocumentoAprobadorEstado).toHaveBeenCalledWith({
      tramiteId: 1,
      facturaId: 2,
      usuarioAprobadorId: 101,
      estado: DOCUMENTO_DECISIONES.APROBADO,
      motivo: null
    }, expect.any(Object));
    expect(repo.updateDocumentoDecision).not.toHaveBeenCalled();
    expect(repo.insertHistorialDocumento).toHaveBeenCalled();
  });

  test('decisionDocumento bloquea una segunda decision de gerencia ya registrada', async () => {
    const { repo } = createRepoMock({
      listTramiteDocumentoAprobadores: jest.fn().mockResolvedValue([
        {
          factura_id: 2,
          usuario_aprobador_id: 101,
          estado_gerencia: 'aprobado'
        }
      ]),
      listTramiteDocumentoAprobadoresForUpdate: jest.fn().mockResolvedValue([
        {
          factura_id: 2,
          usuario_aprobador_id: 101,
          estado_gerencia: 'aprobado'
        }
      ])
    });
    const useCases = createTramitesPagoUseCases({ tramitesPagoRepo: repo });

    await expect(useCases.decisionDocumento({
      id: 1,
      facturaId: 2,
      etapa: 'gerencia',
      decision: DOCUMENTO_DECISIONES.RECHAZADO,
      motivo: 'cambio tardio',
      usuario: 'gerencia@novogar.local',
      actorUserId: 101,
      actorPermissions: ['documentos_ver']
    })).rejects.toThrow('Tu decision de gerencia ya fue registrada para este documento');

    expect(repo.updateTramiteDocumentoAprobadorEstado).not.toHaveBeenCalled();
    expect(repo.updateDocumentoDecision).not.toHaveBeenCalled();
  });
});
