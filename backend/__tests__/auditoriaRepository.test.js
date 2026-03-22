jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const auditoriaRepository = require('../repositories/auditoriaRepository');

describe('auditoriaRepository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('listEstadosByFacturaId unifica solo historiales dedicados por dominio', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await auditoriaRepository.listEstadosByFacturaId(77);

    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('facturas_estado_documental_historial');
    expect(sql).toContain('facturas_workflow_pago_historial');
    expect(sql).toContain('facturas_estado_mixto_historial');
    expect(sql).not.toContain("'estados_documento'::text AS origen_historial");
    expect(params).toEqual([77]);
  });
});
