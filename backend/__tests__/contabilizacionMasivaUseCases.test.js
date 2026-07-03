const { createContabilizacionMasivaUseCases } = require('../services/contabilizacionMasivaUseCases');
const diarioParser = require('../services/diarioDocumentosParser');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const fullAccessUser = { id: 1, permissions: ['acceso_total'] };
const assignedUser = { id: 2, permissions: ['sociedades_asignadas', 'documentos_contabilizar'] };

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
      usuario_aprobador_email: 'aprobador@sendadocs.local',
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
  searchFacturasBySociedad: jest.fn().mockResolvedValue([]),
  insertContabilizacionFromImport: jest.fn().mockResolvedValue({ id: 20 }),
  updateContabilizacionImportFields: jest.fn().mockResolvedValue({ id: 10 }),
  updateFacturaEstado: jest.fn().mockResolvedValue(null),
  insertEstadoDocumento: jest.fn().mockResolvedValue(null)
});

describe('contabilizacionMasivaUseCases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

    const report = await useCases.analyzeDiarioDocumentos({
      sociedadId: 23,
      user: fullAccessUser
    });

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

  test('analyzeDiarioDocumentos rechaza sociedades no asignadas antes de leer facturas', async () => {
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([99]);
    const repo = createRepo();
    const useCases = createContabilizacionMasivaUseCases({ repo });

    await expect(useCases.analyzeDiarioDocumentos({
      sociedadId: 23,
      user: assignedUser
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
    expect(repo.getSociedadById).not.toHaveBeenCalled();
    expect(repo.listFacturasBySociedad).not.toHaveBeenCalled();
  });

  test('applyDiarioDocumentos rechaza sociedades no asignadas antes de abrir transaccion', async () => {
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([99]);
    const repo = createRepo();
    const runInTransaction = jest.fn(async (handler) => handler({ tx: true }));
    const useCases = createContabilizacionMasivaUseCases({ repo, runInTransaction });

    await expect(useCases.applyDiarioDocumentos({
      sociedadId: 23,
      user: assignedUser,
      usuario: 'contador@sendadocs.local'
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
    expect(runInTransaction).not.toHaveBeenCalled();
    expect(repo.insertContabilizacionFromImport).not.toHaveBeenCalled();
    expect(repo.updateContabilizacionImportFields).not.toHaveBeenCalled();
  });

  test('aplica resoluciones de saltar y asignar en el reporte', async () => {
    const useCases = createContabilizacionMasivaUseCases({ repo: createRepo() });

    const report = await useCases.analyzeDiarioDocumentos({
      sociedadId: 23,
      user: fullAccessUser,
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

  test('resuelve consecutivos ambiguos cuando solo un candidato coincide por proveedor', async () => {
    diarioParser.parseDiarioDocumentosFile.mockReturnValue({
      filePath: 'docs/datos/Documentos/Diario de documentos (1).csv',
      malformedRows: 0,
      asientos: [
        {
          asiento: '2596',
          fecha_contabilizacion: '27/01/2026',
          referencia2: '10000011606',
          factura11: '10000011606',
          proveedor_codigos: ['P00004'],
          proveedor_nombres: ['Proveedor D Sociedad Limitada'],
          centros_costo_codigos: ['11Z0606'],
          filas: 4
        }
      ]
    });
    const repo = createRepo();
    repo.listFacturasBySociedad.mockResolvedValue([
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
    ]);
    const useCases = createContabilizacionMasivaUseCases({ repo });

    const report = await useCases.analyzeDiarioDocumentos({
      sociedadId: 23,
      user: fullAccessUser
    });

    expect(report.summary).toMatchObject({
      ready_new: 1,
      ambiguous: 0
    });
    expect(report.items[0]).toMatchObject({
      status: 'ready_new',
      match_strategy: 'proveedor',
      factura: { id: 4 },
      matches: [{ id: 3 }, { id: 4 }]
    });
  });

  test('aplica solo filas listas y actualiza parcialmente las ya contabilizadas', async () => {
    const repo = createRepo();
    const runInTransaction = jest.fn(async (handler) => handler({ tx: true }));
    const useCases = createContabilizacionMasivaUseCases({ repo, runInTransaction });

    const result = await useCases.applyDiarioDocumentos({
      sociedadId: 23,
      user: fullAccessUser,
      usuario: 'contador@sendadocs.local'
    });

    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(repo.insertContabilizacionFromImport).toHaveBeenCalledTimes(1);
    expect(repo.insertContabilizacionFromImport).toHaveBeenCalledWith(expect.objectContaining({
      facturaId: 1,
      asiento: '2594',
      centroCosto: '11Z0606 - Centro Z',
      usuario: 'contador@sendadocs.local'
    }), { tx: true });
    expect(repo.updateContabilizacionImportFields).toHaveBeenCalledTimes(1);
    expect(repo.updateContabilizacionImportFields).toHaveBeenCalledWith(expect.objectContaining({
      facturaId: 2,
      asiento: '2595',
      centroCosto: '11Z0606 - Centro Z + 1 mas'
    }), { tx: true });
    expect(repo.updateFacturaEstado).toHaveBeenCalledTimes(1);
    expect(repo.updateFacturaEstado).toHaveBeenCalledWith({
      facturaId: 1,
      estado: 'contabilizado'
    }, { tx: true });
    expect(repo.insertEstadoDocumento).toHaveBeenCalledTimes(1);
    expect(result.summary).toMatchObject({
      applied: 2,
      created: 1,
      updated: 1,
      skipped: 2
    });
  });
});
