const { createDashboardUseCases } = require('../services/dashboardUseCases');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const fullAccessUser = { id: 1, permissions: ['acceso_total'] };
const assignedUser = { id: 2, permissions: ['sociedades_asignadas', 'documentos_ver'] };

const createRepoMock = (overrides = {}) => ({
  getFacturasStats: jest.fn().mockResolvedValue({
    total_facturas: 12,
    no_contabilizado: 4,
    en_revision: 1,
    contabilizado_simple: 3,
    en_tramite: 2,
    pagados_parcialmente: 1,
    pagados: 1,
    contabilizados: 6,
    rechazados: 0,
    total_mes: 8
  }),
  countNotasCredito: jest.fn().mockResolvedValue({ count: 2 }),
  countMensajesHacienda: jest.fn().mockResolvedValue({ count: 3 }),
  countSociedades: jest.fn().mockResolvedValue({ count: 1 }),
  getMonedasResumen: jest.fn().mockResolvedValue([
    { moneda: 'CRC', estado: 'no_contabilizado', total: '409094573.66', count: 332 },
    { moneda: 'USD', estado: 'no_contabilizado', total: '643074.30', count: 97 },
    { moneda: 'CRC', estado: 'contabilizado', total: '250000', count: 5 },
    { moneda: 'CRC', estado: 'pagado', total: '800', count: 2 },
    { moneda: 'USD', estado: 'pagado', total: '150', count: 1 }
  ]),
  getCuentasPagarResumenPorMoneda: jest.fn().mockResolvedValue([
    {
      moneda: 'CRC',
      docs_por_pagar: 2,
      monto_por_pagar: '1000',
      docs_vencidas: 1,
      monto_vencidas: '400',
      docs_por_vencer_7: 1,
      monto_por_vencer_7: '600',
      docs_retencion_pendiente: 1,
      monto_retencion_pendiente: '75',
      monto_pendiente_global: '1075'
    },
    {
      moneda: 'USD',
      docs_por_pagar: 1,
      monto_por_pagar: '250',
      docs_vencidas: 0,
      monto_vencidas: '0',
      docs_por_vencer_7: 1,
      monto_por_vencer_7: '250',
      docs_retencion_pendiente: 0,
      monto_retencion_pendiente: '0',
      monto_pendiente_global: '250'
    }
  ]),
  getTopProveedoresPorPagar: jest.fn().mockResolvedValue([
    {
      proveedor_id: 10,
      proveedor_nombre: 'Proveedor Uno',
      proveedor_identificacion: '3101111111',
      moneda: 'CRC',
      documentos: 2,
      total_a_pagar: '1000',
      total_retencion_pendiente: '75',
      total_pendiente_global: '1075'
    },
    {
      proveedor_id: 10,
      proveedor_nombre: 'Proveedor Uno',
      proveedor_identificacion: '3101111111',
      moneda: 'USD',
      documentos: 1,
      total_a_pagar: '250',
      total_retencion_pendiente: '0',
      total_pendiente_global: '250'
    }
  ]),
  getTramitesWorkQueueSummary: jest.fn().mockResolvedValue({
    activos: 4,
    estado_en_aprobacion_gerencia: 1,
    estado_en_aprobacion_gerencia_contable: 1,
    estado_en_aprobacion_gerencia_financiera: 0,
    estado_en_revision_tesoreria: 0,
    estado_en_revision_tesoreria_1: 1,
    estado_en_revision_tesoreria_2: 1,
    estado_pagado: 2,
    estado_cancelado: 0,
    aprobaciones_pendientes_gerencia: 3,
    aprobaciones_pendientes_gerencia_contable: 2,
    aprobaciones_pendientes_financiera: 0,
    rechazados_activos: 1
  }),
  listRecentFacturas: jest.fn().mockResolvedValue([]),
  listRecentNotasCredito: jest.fn().mockResolvedValue([]),
  listRecentMensajesHacienda: jest.fn().mockResolvedValue([]),
  listRecentDocuments: jest.fn().mockResolvedValue([]),
  ...overrides
});

describe('dashboardUseCases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getStats separa montos y rankings por moneda', async () => {
    const repo = createRepoMock();
    const useCases = createDashboardUseCases({ dashboardRepo: repo });

    const result = await useCases.getStats({ sociedadId: 4, user: fullAccessUser });

    expect(repo.getCuentasPagarResumenPorMoneda).toHaveBeenCalledWith({ sociedadId: 4 });
    expect(result.cuentasPorPagar).toEqual({
      documentos: 3,
      montosPorMoneda: [
        { moneda: 'CRC', monto: 1000, documentos: 2 },
        { moneda: 'USD', monto: 250, documentos: 1 }
      ]
    });
    expect(result.vencidas).toEqual({
      documentos: 1,
      montosPorMoneda: [
        { moneda: 'CRC', monto: 400, documentos: 1 }
      ]
    });
    expect(result.porVencer7Dias).toEqual({
      documentos: 2,
      montosPorMoneda: [
        { moneda: 'CRC', monto: 600, documentos: 1 },
        { moneda: 'USD', monto: 250, documentos: 1 }
      ]
    });
    expect(result.retencionesPendientes).toEqual({
      documentos: 1,
      montosPorMoneda: [
        { moneda: 'CRC', monto: 75, documentos: 1 }
      ]
    });
    expect(result.pagadas).toEqual({
      documentos: 3,
      montosPorMoneda: [
        { moneda: 'CRC', monto: 800, documentos: 2 },
        { moneda: 'USD', monto: 150, documentos: 1 }
      ]
    });
    expect(result.montoPendienteGlobalPorMoneda).toEqual([
      { moneda: 'CRC', monto: 1075, documentos: 2 },
      { moneda: 'USD', monto: 250, documentos: 1 }
    ]);
    expect(result.topProveedoresPorPagar).toEqual({
      CRC: [
        {
          proveedorId: 10,
          proveedorNombre: 'Proveedor Uno',
          proveedorIdentificacion: '3101111111',
          moneda: 'CRC',
          documentos: 2,
          totalAPagar: 1000,
          totalRetencionPendiente: 75,
          totalPendienteGlobal: 1075
        }
      ],
      USD: [
        {
          proveedorId: 10,
          proveedorNombre: 'Proveedor Uno',
          proveedorIdentificacion: '3101111111',
          moneda: 'USD',
          documentos: 1,
          totalAPagar: 250,
          totalRetencionPendiente: 0,
          totalPendienteGlobal: 250
        }
      ]
    });
  });

  test('getWorkQueue resume cola documental y aprobaciones por etapa', async () => {
    const repo = createRepoMock({
      listRecentDocuments: jest.fn().mockResolvedValue([
        { id: 1, motivo: 'Falta soporte' },
        { id: 2, motivo: '' },
        { id: 3, motivo: 'Escalar aprobacion' }
      ])
    });
    const useCases = createDashboardUseCases({ dashboardRepo: repo });

    const result = await useCases.getWorkQueue({ sociedadId: 18, user: fullAccessUser });

    expect(repo.getTramitesWorkQueueSummary).toHaveBeenCalledWith({ sociedadId: 18 });
    expect(result).toMatchObject({
      facturas: {
        noContabilizadas: 4,
        enRevision: 1,
        porPagar: 3,
        vencidas: 1,
        porVencer7Dias: 2,
        retencionesPendientes: 1,
        enTramite: 3,
        pagadas: 1
      },
      tramites: {
        activos: 4,
        porEstado: {
          en_aprobacion_gerencia: 1,
          en_aprobacion_gerencia_contable: 1,
          en_aprobacion_gerencia_financiera: 0,
          en_revision_tesoreria: 0,
          en_revision_tesoreria_1: 1,
          en_revision_tesoreria_2: 1,
          pagado: 2,
          cancelado: 0
        },
        aprobacionesPendientes: {
          gerencia: 3,
          gerencia_contable: 2,
          financiera: 0
        },
        rechazadosActivos: 1
      },
      documentosRecientes: {
        total: 3,
        conMotivo: 2
      },
      sociedades: {
        visibles: 1
      }
    });
    expect(typeof result.updatedAt).toBe('string');
  });

  test('getStats limita a sociedades asignadas cuando se omite sociedadId', async () => {
    const repo = createRepoMock();
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([10, 20]);
    const useCases = createDashboardUseCases({ dashboardRepo: repo });

    await useCases.getStats({ user: assignedUser });

    expect(usuariosSociedadesRepo.listSociedadIdsByUsuarioId).toHaveBeenCalledWith(2);
    expect(repo.getFacturasStats).toHaveBeenCalledWith({ sociedadIds: [10, 20] });
    expect(repo.countSociedades).toHaveBeenCalledWith({ sociedadIds: [10, 20] });
    expect(repo.getTopProveedoresPorPagar).toHaveBeenCalledWith({
      sociedadIds: [10, 20],
      limit: 10,
    });
  });

  test('getWorkQueue rechaza sociedad no asignada', async () => {
    const repo = createRepoMock();
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([10]);
    const useCases = createDashboardUseCases({ dashboardRepo: repo });

    await expect(useCases.getWorkQueue({
      sociedadId: '99',
      user: assignedUser,
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada',
    });

    expect(repo.getFacturasStats).not.toHaveBeenCalled();
  });
});
