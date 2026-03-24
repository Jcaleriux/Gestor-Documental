const { __test__ } = require('../services/tramitesPagoCaratulasProviderSupport');

describe('tramitesPagoCaratulasProviderSupport file naming', () => {
  test('evita rutas con doble punto al generar archivos por proveedor', () => {
    const filename = __test__.buildProviderFileName({
      providerEntry: {
        provider_name: 'FYPSA FORMALETAS Y PUNTALES S.A.'
      },
      sourceFilename: '20.bsp usd.pdf'
    });

    expect(filename).toBe('20.bsp_usd_FYPSA_FORMALETAS_Y_PUNTALES_S.A.pdf');
    expect(filename.includes('..')).toBe(false);
  });

  test('evita rutas con doble punto al generar archivos huerfanos', () => {
    const filename = __test__.buildOrphanFileName({
      orphanGroup: {
        provider_raw_name: 'DEHC S.A.'
      },
      sourceFilename: '20.bsp usd.pdf',
      index: 0
    });

    expect(filename).toBe('20.bsp_usd_DEHC_S.A.pdf');
    expect(filename.includes('..')).toBe(false);
  });
});
