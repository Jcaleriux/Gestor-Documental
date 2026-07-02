const { createAuditoriaUseCases } = require('../services/auditoriaUseCases');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const fullAccessUser = { id: 1, permissions: ['acceso_total'] };
const assignedUser = { id: 2, permissions: ['sociedades_asignadas', 'documentos_contabilizar'] };

const createRepoMock = (overrides = {}) => ({
  getFacturaById: jest.fn().mockResolvedValue({ id: 99, sociedad_id: 10 }),
  listAuditoriaByFacturaId: jest.fn().mockResolvedValue([]),
  createAuditoria: jest.fn().mockResolvedValue(null),
  listEstadosByFacturaId: jest.fn().mockResolvedValue([]),
  listTramiteHistorialByFacturaId: jest.fn().mockResolvedValue([]),
  listGerenciaAprobacionesByFacturaId: jest.fn().mockResolvedValue([]),
  listTramiteDocumentoLinksByFacturaId: jest.fn().mockResolvedValue([]),
  listPagosFacturaByFacturaId: jest.fn().mockResolvedValue([]),
  listRetencionPagosByFacturaId: jest.fn().mockResolvedValue([]),
  createEstado: jest.fn().mockResolvedValue(null),
  updateFacturaEstado: jest.fn().mockResolvedValue(null),
  ...overrides
});

describe('auditoriaUseCases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('listEstados unifica la trazabilidad del documento y la ordena por fecha', async () => {
    const repo = createRepoMock({
      listEstadosByFacturaId: jest.fn().mockResolvedValue([
        {
          id: 11,
          dominio: 'workflow_pago',
          estado_anterior: 'en_tramite_pago',
          estado_nuevo: 'pagado',
          usuario: 'tesoreria@novogar.local',
          creado_en: '2026-03-18T10:00:00.000Z',
          motivo: null
        }
      ]),
      listTramiteHistorialByFacturaId: jest.fn().mockResolvedValue([
        {
          id: 21,
          tramite_id: 7,
          accion: 'tesoreria_reenviar',
          estado_anterior: 'en_revision_tesoreria',
          estado_nuevo: 'en_aprobacion_gerencia_financiera',
          usuario: 'tesoreria@novogar.local',
          creado_en: '2026-03-17T11:00:00.000Z',
          motivo: 'Requiere una nueva revision'
        },
        {
          id: 22,
          tramite_id: 7,
          accion: 'decision_gerencia',
          estado_anterior: null,
          estado_nuevo: null,
          usuario: 'gerencia@novogar.local',
          creado_en: '2026-03-17T10:00:00.000Z',
          motivo: null
        }
      ]),
      listGerenciaAprobacionesByFacturaId: jest.fn().mockResolvedValue([
        {
          id: 31,
          tramite_id: 7,
          usuario_aprobador_id: 101,
          usuario_aprobador_nombre: 'Gerencia Ventas',
          usuario_aprobador_email: 'ventas@novogar.local',
          estado_gerencia: 'aprobado',
          motivo_gerencia: null,
          decision_en: '2026-03-16T09:00:00.000Z',
          creado_en: '2026-03-15T08:00:00.000Z',
          actualizado_en: '2026-03-16T09:00:00.000Z'
        }
      ]),
      listTramiteDocumentoLinksByFacturaId: jest.fn().mockResolvedValue([
        {
          id: 41,
          tramite_id: 7,
          estado_factura_origen: 'contabilizado',
          tramite_estado: 'en_aprobacion_gerencia',
          tramite_creado_en: '2026-03-15T07:00:00.000Z',
          tramite_creado_por: 'contabilidad@novogar.local',
          actualizado_en: '2026-03-15T07:00:00.000Z'
        }
      ]),
      listPagosFacturaByFacturaId: jest.fn().mockResolvedValue([
        {
          id: 51,
          tramite_id: 7,
          monto: '28617.25',
          moneda: 'CRC',
          usuario: 'tesoreria@novogar.local',
          fecha_pago: '2026-03-18',
          creado_en: '2026-03-18T12:00:00.000Z',
          notas: 'Transferencia bancaria'
        }
      ]),
      listRetencionPagosByFacturaId: jest.fn().mockResolvedValue([
        {
          id: 61,
          contabilizacion_id: 91,
          monto: '4200.00',
          moneda: 'CRC',
          usuario: 'tesoreria@novogar.local',
          fecha_pago: '2026-03-18',
          creado_en: '2026-03-18T13:00:00.000Z',
          notas: 'Pago de retencion'
        }
      ])
    });
    const useCases = createAuditoriaUseCases({ auditoriaRepo: repo });

    const result = await useCases.listEstados({
      facturaId: 99,
      user: fullAccessUser
    });

    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({
      tipo: 'pago_retencion',
      titulo: 'Pago de retencion registrado',
      categoria: 'retencion',
      monto: 4200,
      moneda: 'CRC'
    });
    expect(result[1]).toMatchObject({
      tipo: 'pago_principal',
      titulo: 'Pago principal registrado',
      categoria: 'pago',
      referencia: 'Tramite #7'
    });
    expect(result[2]).toMatchObject({
      tipo: 'estado_documento',
      titulo: 'Factura marcada como pagada',
      categoria: 'estado',
      dominio: 'workflow_pago'
    });
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: 'aprobacion_gerencia',
          titulo: 'Aprobacion de gerencia registrada',
          usuario: 'Gerencia Ventas'
        }),
        expect.objectContaining({
          tipo: 'tramite_historial',
          titulo: 'Documento reenviado a Aprobacion gerencia financiera',
          categoria: 'tesoreria',
          motivo: 'Requiere una nueva revision'
        }),
        expect.objectContaining({
          tipo: 'tramite_documento',
          titulo: 'Incluida en tramite #7'
        })
      ])
    );
    expect(result.find((item) => item.usuario === 'gerencia@novogar.local')).toBeUndefined();
  });

  test('actualizarEstadoFactura rechaza factura fuera de sociedades asignadas antes de escribir', async () => {
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([20]);
    const repo = createRepoMock();
    const useCases = createAuditoriaUseCases({ auditoriaRepo: repo });

    await expect(useCases.actualizarEstadoFactura({
      facturaId: 99,
      estado: 'pagado',
      user: assignedUser
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
    expect(repo.updateFacturaEstado).not.toHaveBeenCalled();
  });

  test('crearEstado rechaza factura fuera de sociedades asignadas antes de registrar historial', async () => {
    jest.spyOn(usuariosSociedadesRepo, 'listSociedadIdsByUsuarioId').mockResolvedValue([20]);
    const repo = createRepoMock();
    const useCases = createAuditoriaUseCases({ auditoriaRepo: repo });

    await expect(useCases.crearEstado({
      facturaId: 99,
      estado_nuevo: 'contabilizado',
      usuario: 'qa',
      user: assignedUser
    })).rejects.toMatchObject({
      status: 403,
      message: 'No tiene acceso a la sociedad solicitada'
    });
    expect(repo.createEstado).not.toHaveBeenCalled();
  });
});
