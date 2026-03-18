const { createDashboardUseCases } = require('../services/dashboardUseCases');

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
  listRecentFacturas: jest.fn().mockResolvedValue([]),
  listRecentNotasCredito: jest.fn().mockResolvedValue([]),
  listRecentMensajesHacienda: jest.fn().mockResolvedValue([]),
  listRecentDocuments: jest.fn().mockResolvedValue([]),
  ...overrides
});

describe('dashboardUseCases', () => {
  test('getStats separa montos y rankings por moneda', async () => {
    const repo = createRepoMock();
    const useCases = createDashboardUseCases({ dashboardRepo: repo });

    const result = await useCases.getStats({ sociedadId: 4 });

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
});
