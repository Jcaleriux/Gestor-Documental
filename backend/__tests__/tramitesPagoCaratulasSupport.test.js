const {
  applyAutomaticMatchingToPayload
} = require('../services/tramitesPagoCaratulasSupport');

describe('tramitesPagoCaratulasSupport', () => {
  test('parseTramiteCaratulaPdf extrae sociedad, fecha y agrupa paginas contiguas por proveedor', async () => {
    jest.resetModules();

    jest.doMock('pdf-parse', () => ({
      PDFParse: jest.fn().mockImplementation(() => ({
        getInfo: async () => ({ total: 2 }),
        getText: async ({ partial }) => {
          const pageNumber = partial[0];
          if (pageNumber === 1) {
            return {
              text: `
                ESENCIA DESAMPARADOS - 3-101-877955 S.A.
                Moneda del pago:
                CRC
                Pagina: 1/2
                Fecha de ejecución: 3/3/2026
                UNIFORMES KELINDA S.A. (P00803)
                3-101-224478
                137,012.50 CRC 274,025.00 137,012.50 0.00 Factura 10000001865
              `
            };
          }
          return {
            text: `
              ESENCIA DESAMPARADOS - 3-101-877955 S.A.
              Moneda del pago:
              CRC
              Pagina: 2/2
              Fecha de ejecución: 3/3/2026
              UNIFORMES KELINDA S.A. (P00803)
              3-101-224478
              301,039.96 CRC 301,039.96 0.00 0.00 Factura 10000013665
            `
          };
        },
        destroy: async () => {}
      }))
    }));

    const { parseTramiteCaratulaPdf } = require('../services/tramitesPagoCaratulasSupport');
    const parsed = await parseTramiteCaratulaPdf({
      pdfBuffer: Buffer.from('%PDF-fake')
    });

    expect(parsed.total_pages).toBe(2);
    expect(parsed.execution_date).toBe('2026-03-03');
    expect(parsed.society.raw_name).toMatch(/ESENCIA DESAMPARADOS/i);
    expect(parsed.society.raw_identification).toBe('3-101-877955');
    expect(parsed.provider_groups.length).toBe(1);
    expect(parsed.provider_groups[0].provider_raw_name).toMatch(/UNIFORMES KELINDA/i);
    expect(parsed.provider_groups[0].page_start).toBe(1);
    expect(parsed.provider_groups[0].page_end).toBe(2);
    expect(parsed.provider_groups[0].lines.length).toBe(2);
    expect(parsed.provider_groups[0].lines[0].document_raw).toMatch(/Factura 10000001865/i);
  });

  test('applyAutomaticMatchingToPayload prioriza consecutivo y luego monto unico', () => {
    const parsedPayload = {
      version: 1,
      total_pages: 1,
      execution_date: '2026-03-03',
      currency: 'CRC',
      society: {
        raw_name: 'ESENCIA DESAMPARADOS S.A.',
        raw_identification: '3-101-877955'
      },
      warnings: [],
      provider_groups: [
        {
          group_key: 'group_1_1_1',
          page_start: 1,
          page_end: 1,
          page_numbers: [1],
          provider_raw_name: 'UNIFORMES KELINDA S.A.',
          provider_raw_identification: '3-101-224478',
          provider_code: 'P00803',
          execution_date: '2026-03-03',
          currency: 'CRC',
          matched_provider: null,
          warnings: [],
          lines: [
            {
              line_key: 'line_1',
              orden: 1,
              document_raw: 'Factura 10000001865',
              consecutivo_last11: '10000001865',
              moneda: 'CRC',
              monto_total: 274025,
              matched_factura_id: null,
              match_strategy: null,
              match_status: 'unmatched',
              warning: null
            },
            {
              line_key: 'line_2',
              orden: 2,
              document_raw: 'Factura sin consecutivo visible',
              consecutivo_last11: '',
              moneda: 'CRC',
              monto_total: 301039.96,
              matched_factura_id: null,
              match_strategy: null,
              match_status: 'unmatched',
              warning: null
            }
          ]
        }
      ]
    };

    const documents = [
      {
        factura_id: 101,
        proveedor_id: 30,
        proveedor_nombre: 'UNIFORMES KELINDA S.A.',
        proveedor_identificacion: '3-101-224478',
        consecutivo: '10000001865',
        total_factura: 274025,
        total_a_pagar: 137012.5,
        resumen: { CodigoTipoMoneda: { CodigoMoneda: 'CRC' } }
      },
      {
        factura_id: 102,
        proveedor_id: 30,
        proveedor_nombre: 'UNIFORMES KELINDA S.A.',
        proveedor_identificacion: '3-101-224478',
        consecutivo: '10000013665',
        total_factura: 301039.96,
        total_a_pagar: 301039.96,
        resumen: { CodigoTipoMoneda: { CodigoMoneda: 'CRC' } }
      }
    ];

    const society = {
      razon_social: 'ESENCIA DESAMPARADOS S.A.',
      nombre_proyecto: 'Esencia Desamparados',
      cedula_juridica: '3-101-877955'
    };

    const result = applyAutomaticMatchingToPayload({
      parsedPayload,
      documents,
      society
    });

    expect(result.society.matched).toBe(true);
    expect(result.provider_groups[0].matched_provider.provider_id).toBe(30);
    expect(result.provider_groups[0].lines[0].matched_factura_id).toBe(101);
    expect(result.provider_groups[0].lines[0].match_strategy).toBe('consecutivo');
    expect(result.provider_groups[0].lines[1].matched_factura_id).toBe(102);
    expect(result.provider_groups[0].lines[1].match_strategy).toBe('monto_total');
    expect(result.summary.state).toBe('procesada');
  });
});
