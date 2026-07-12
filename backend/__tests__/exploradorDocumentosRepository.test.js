jest.mock('../db', () => ({ query: jest.fn() }));

const pool = require('../db');
const repository = require('../repositories/exploradorDocumentosRepository');

describe('exploradorDocumentosRepository', () => {
  beforeEach(() => pool.query.mockReset());

  test('aplica filtros parametrizados y preserva moneda en los agregados', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{}] });

    await repository.getResumen({
      sociedadId: 18,
      filters: { moneda: 'USD', proveedor: 'Acme' }
    });

    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual([18, 'USD', 'Acme']);
    expect(sql).toContain("f.resumen->'CodigoTipoMoneda'");
    expect(sql).toContain('GROUP BY moneda');
    expect(sql).toContain('LOWER');
    expect(sql).not.toContain("LIKE LOWER('%Acme%')");
  });

  test('pagina despues de construir el alcance por sociedad', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await repository.listDocumentos({ sociedadId: 7, filters: {}, page: 2, pageSize: 25 });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('LIMIT $2 OFFSET $3');
    expect(params).toEqual([7, 25, 25]);
  });
});
