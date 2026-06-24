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

  test('getTramitesWorkQueueSummary agrega pendientes por etapa y rechazos activos', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await dashboardRepository.getTramitesWorkQueueSummary({ sociedadId: 18 });

    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WITH tramites_base AS');
    expect(sql).toContain('aprobaciones_pendientes_gerencia');
    expect(sql).toContain('estado_gerencia_contable');
    expect(sql).toContain('rechazados_activos');
    expect(params).toEqual([18]);
  });

  test('getCuentasPagarResumenPorMoneda incluye no contabilizadas y en revision solo para vencidas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await dashboardRepository.getCuentasPagarResumenPorMoneda({ sociedadId: 18 });

    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("'no_contabilizado'");
    expect(sql).toContain("'en_revision'");
    expect(sql).toContain('fc.fecha_vencimiento < CURRENT_DATE');
    expect(sql.match(/AS docs_por_pagar/g)).toHaveLength(1);
    expect(sql).toContain('COUNT(*) FILTER (');
    expect(sql).toContain("'contabilizado'");
    expect(sql).toContain("'en_tramite_pago'");
    expect(sql).toContain("'pagado_parcialmente'");
    expect(params).toEqual([18]);
  });
});
