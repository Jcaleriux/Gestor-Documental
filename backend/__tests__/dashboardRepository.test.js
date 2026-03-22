jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const dashboardRepository = require('../repositories/dashboardRepository');

describe('dashboardRepository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('getMonedasResumen agrupa por columnas proyectadas sin alias ambiguos', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await dashboardRepository.getMonedasResumen({ sociedadId: 18 });

    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('GROUP BY 1, 2');
    expect(sql).not.toContain('GROUP BY moneda, estado');
    expect(params).toEqual([18]);
  });

  test('listRecentDocuments unifica solo historiales dedicados por dominio', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await dashboardRepository.listRecentDocuments({ sociedadId: 18 });

    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('facturas_estado_documental_historial');
    expect(sql).toContain('facturas_workflow_pago_historial');
    expect(sql).toContain('facturas_estado_mixto_historial');
    expect(sql).not.toContain("'estados_documento'::text AS origen_historial");
    expect(params).toEqual([18]);
  });
});
