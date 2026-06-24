jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const facturasRepository = require('../repositories/facturasRepository');

describe('facturasRepository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('listFacturas con dashboardPreset vencidas incluye facturas no contabilizadas y en revision', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    await facturasRepository.listFacturas({
      sociedadId: 18,
      dashboardPreset: 'vencidas',
      page: 1,
      pageSize: 25,
    });

    expect(pool.query).toHaveBeenCalledTimes(4);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("'no_contabilizado'");
    expect(sql).toContain("'en_revision'");
    expect(sql).toContain("'contabilizado'");
    expect(sql).toContain("'en_tramite_pago'");
    expect(sql).toContain("'pagado_parcialmente'");
    expect(sql).not.toContain("'pagado'\n  )\n");
    expect(sql).toContain('fe.fecha_vencimiento IS NOT NULL');
    expect(sql).toContain('fe.fecha_vencimiento < CURRENT_DATE');
    expect(params).toEqual([18, 25, 0]);
  });
});
