const { createExploradorDocumentosUseCases } = require('../services/exploradorDocumentosUseCases');

const user = { id: 1, permissions: ['acceso_total', 'documentos_ver'] };

const createRepo = () => ({
  getResumen: jest.fn().mockResolvedValue({
    total_documentos: 2,
    totales_por_moneda: [
      { moneda: 'CRC', documentos: 1, total: '1000', pendiente: '800' },
      { moneda: 'USD', documentos: 1, total: '50', pendiente: '25' }
    ],
    serie_mensual: [],
    estados: [{ estado: 'contabilizado', documentos: 2 }],
    top_proveedores: []
  }),
  listDocumentos: jest.fn().mockResolvedValue([
    {
      id: 10,
      moneda: 'CRC',
      total: '1000',
      total_a_pagar: '800',
      retencion_pendiente: '0',
      pendiente_global: '800',
      metadata: { centros_costo_lineas: [{ codigo: 'CC-01' }] }
    }
  ])
});

describe('exploradorDocumentosUseCases', () => {
  test('mantiene agregados CRC y USD separados y pagina los documentos', async () => {
    const repo = createRepo();
    const useCases = createExploradorDocumentosUseCases({ exploradorRepo: repo });

    const result = await useCases.explorar({
      query: { sociedadId: '18', page: '1', pageSize: '25' },
      user
    });

    expect(repo.getResumen).toHaveBeenCalledWith(expect.objectContaining({ sociedadId: 18 }));
    expect(result.resumen.totalesPorMoneda).toEqual([
      { moneda: 'CRC', documentos: 1, total: 1000, pendiente: 800 },
      { moneda: 'USD', documentos: 1, total: 50, pendiente: 25 }
    ]);
    expect(result.documentos[0]).toMatchObject({
      id: 10,
      moneda: 'CRC',
      pendienteGlobal: 800,
      contabilizacion: { centrosCostoLineas: [{ codigo: 'CC-01' }] }
    });
    expect(result.paginacion).toMatchObject({ totalItems: 2, totalPages: 1 });
  });

  test('rechaza moneda y fechas invalidas antes de consultar', async () => {
    const repo = createRepo();
    const useCases = createExploradorDocumentosUseCases({ exploradorRepo: repo });

    await expect(useCases.explorar({ query: { sociedadId: 18, moneda: 'EUR' }, user }))
      .rejects.toMatchObject({ status: 400, message: 'moneda invalida' });
    await expect(useCases.explorar({ query: { sociedadId: 18, fechaDesde: '2026-02-31' }, user }))
      .rejects.toMatchObject({ status: 400, message: 'fechaDesde invalida' });
    expect(repo.getResumen).not.toHaveBeenCalled();
  });
});
