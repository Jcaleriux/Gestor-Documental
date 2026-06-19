const { createContabilizacionMasivaUseCases } = require('../services/contabilizacionMasivaUseCases');
const diarioParser = require('../services/diarioDocumentosParser');

jest.mock('../services/diarioDocumentosParser', () => {
  const actual = jest.requireActual('../services/diarioDocumentosParser');
  return {
    ...actual,
    parseDiarioDocumentosFile: jest.fn()
  };
});

const createRepo = () => ({
  getSociedadById: jest.fn().mockResolvedValue({
    id: 23,
    codigo: 'BSP',
    cedula_juridica: '3-101-887961',
    razon_social: '3-101-887961, S. A.'
  }),
  listFacturasBySociedad: jest.fn().mockResolvedValue([
    {
      id: 1,
      sociedad_id: 23,
      consecutivo: '00100001010000011604',
      clave: 'clave-1',
      estado: 'no_contabilizado',
      emisor: { Nombre: 'Proveedor A' },
      resumen: { TotalComprobante: '100' },
      contabilizacion_id: null
    },
    {
      id: 2,
      sociedad_id: 23,
      consecutivo: '00100001010000011605',
      clave: 'clave-2',
      estado: 'contabilizado',
      emisor: { Nombre: 'Proveedor B' },
      resumen: { TotalComprobante: '200' },
      contabilizacion_id: 10,
      contabilizacion_asiento: '2500'
    },
    {
      id: 3,
      sociedad_id: 23,
      consecutivo: '00100001010000011606',
      clave: 'clave-3',
      estado: 'no_contabilizado',
      emisor: { Nombre: 'Proveedor C' },
      resumen: { TotalComprobante: '300' },
      contabilizacion_id: null
    },
    {
      id: 4,
      sociedad_id: 23,
      consecutivo: '00100001010000011606',
      clave: 'clave-4',
      estado: 'no_contabilizado',
      emisor: { Nombre: 'Proveedor D' },
      resumen: { TotalComprobante: '400' },
      contabilizacion_id: null
    }
  ]),
  listCentrosCostoBySociedad: jest.fn().mockResolvedValue([
    {
      id: 50,
      codigo: '11Z0606',
      nombre: 'Centro Z',
      usuario_aprobador_id: 7,
      usuario_aprobador_nombre: 'Aprobador',
      usuario_aprobador_email: 'aprobador@novogar.local',
      activo: true,
      seleccionable_en_contabilizacion: true
    },
    {
      id: 51,
      codigo: '11Y0714',
      nombre: 'Centro Y',
      rol_aprobador_id: 3,
      rol_aprobador_codigo: 'gerencia',
      rol_aprobador_nombre: 'Gerencia',
      activo: true,
      seleccionable_en_contabilizacion: true
    }
  ]),
  searchFacturasBySociedad: jest.fn().mockResolvedValue([])
});

describe('contabilizacionMasivaUseCases', () => {
  beforeEach(() => {
    diarioParser.parseDiarioDocumentosFile.mockReturnValue({
      filePath: 'docs/datos/Documentos/Diario de documentos (1).csv',
      malformedRows: 1,
      asientos: [
        {
          asiento: '2594',
          fecha_contabilizacion: '26/01/2026',
          referencia2: '10000011604',
          factura11: '10000011604',
          centros_costo_codigos: ['11Z0606'],
          filas: 4
        },
        {
          asiento: '2595',
          fecha_contabilizacion: '27/01/2026',
          referencia2: '10000011605',
          factura11: '10000011605',
          centros_costo_codigos: ['11Z0606', '11Y0714'],
          filas: 5
        },
        {
          asiento: '2596',
          fecha_contabilizacion: '27/01/2026',
          referencia2: '10000011606',
          factura11: '10000011606',
          centros_costo_codigos: ['11Z0606'],
          filas: 4
        },
        {
          asiento: '2597',
          fecha_contabilizacion: '28/01/2026',
          referencia2: 'NO REF',
          factura11: '',
          centros_costo_codigos: ['11Z0606'],
          filas: 4
        }
      ]
    });
  });

  test('clasifica listas nuevas, existentes, ambiguas y referencias invalidas', async () => {
    const useCases = createContabilizacionMasivaUseCases({ repo: createRepo() });

    const report = await useCases.analyzeDiarioDocumentos({ sociedadId: 23 });

    expect(report.summary).toMatchObject({
      total: 4,
      ready_new: 1,
      ready_update: 1,
      ambiguous: 1,
      invalid_reference: 1,
      multi_centro: 1
    });
    expect(report.items[1]).toMatchObject({
      asiento: '2595',
      status: 'ready_update',
      centro_costo_resumen: '11Z0606 - Centro Z + 1 mas'
    });
    expect(report.items[1].metadata_preview.centros_costo_lineas).toHaveLength(2);
  });

  test('aplica resoluciones de saltar y asignar en el reporte', async () => {
    const useCases = createContabilizacionMasivaUseCases({ repo: createRepo() });

    const report = await useCases.analyzeDiarioDocumentos({
      sociedadId: 23,
      resolutions: [
        { asiento: '2596', action: 'skip' },
        { asiento: '2597', action: 'assign', factura_id: 3 }
      ]
    });

    expect(report.summary).toMatchObject({
      skipped: 1,
      ready_assigned: 1
    });
    expect(report.items.find((item) => item.asiento === '2596').status).toBe('skipped');
    expect(report.items.find((item) => item.asiento === '2597')).toMatchObject({
      status: 'ready_assigned',
      factura: { id: 3 }
    });
  });
});
