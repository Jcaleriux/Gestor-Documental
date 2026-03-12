const { createVentasUseCases } = require('../services/ventasUseCases');
const { VENTA_OPERACION_ESTADOS } = require('../domain/ventas');
const path = require('path');

const createClientMock = () => ({
  query: jest.fn().mockResolvedValue({}),
  release: jest.fn(),
});

const createRepoMock = (overrides = {}) => {
  const client = overrides.client || createClientMock();
  const repo = {
    getClient: jest.fn().mockResolvedValue(client),
    getSociedadByCodigo: jest.fn().mockResolvedValue({ id: 1, codigo: 'EDE', activo: true }),
    upsertUnidad: jest.fn().mockResolvedValue({ id: 10, sociedad_id: 1, proyecto_codigo: 'EDE', unidad_codigo: 'A01' }),
    findActiveOperacionByUnidadId: jest.fn().mockResolvedValue(null),
    getOperacionById: jest.fn().mockResolvedValue({
      id: 100,
      unidad_id: 10,
      sociedad_id: 1,
      proyecto_codigo: 'EDE',
      unidad_codigo: 'A01',
      cliente_nombre: 'CLIENTE BASE',
      cliente_identificacion: '123',
      estado: VENTA_OPERACION_ESTADOS.ACTIVA,
      origen_operacion_id: null,
      motivo: null,
      creado_por: 'qa',
      metadata: null,
    }),
    listOperaciones: jest.fn().mockResolvedValue([]),
    createOperacion: jest.fn().mockResolvedValue({
      id: 200,
      unidad_id: 10,
      sociedad_id: 1,
      proyecto_codigo: 'EDE',
      unidad_codigo: 'A01',
      cliente_nombre: 'CLIENTE BASE',
      cliente_identificacion: '123',
      estado: VENTA_OPERACION_ESTADOS.ACTIVA,
      origen_operacion_id: null,
      motivo: null,
      creado_por: 'qa',
      metadata: null,
    }),
    updateOperacionEstado: jest.fn().mockResolvedValue({
      id: 100,
      unidad_id: 10,
      sociedad_id: 1,
      proyecto_codigo: 'EDE',
      unidad_codigo: 'A01',
      cliente_nombre: 'CLIENTE BASE',
      cliente_identificacion: '123',
      estado: VENTA_OPERACION_ESTADOS.TRASLADADA,
      origen_operacion_id: null,
      motivo: 'traslado',
      creado_por: 'qa',
      metadata: null,
    }),
    insertOperacionHistorial: jest.fn().mockResolvedValue(undefined),
    listOperacionHistorial: jest.fn().mockResolvedValue([]),
    listOperacionDocumentos: jest.fn().mockResolvedValue([]),
    getOperacionDocumentoById: jest.fn().mockResolvedValue(null),
    upsertOperacionDocumento: jest.fn().mockResolvedValue({
      id: 1,
      operacion_id: 100,
      codigo_documento: 'PAGO_RESERVA',
      nombre_archivo: 'PAGO_RESERVA.pdf',
      ruta_archivo: 'C:/tmp/PAGO_RESERVA.pdf',
    }),
    ...overrides,
  };

  return { repo, client };
};

describe('ventasUseCases', () => {
  test('valida contrato minimo del repositorio', () => {
    expect(() => createVentasUseCases({ ventasRepo: {}, baseDir: path.resolve(__dirname, '..', '..') }))
      .toThrow('ventasRepo incompleto');
  });

  test('createOperacion crea operacion activa e historial en transaccion', async () => {
    const { repo, client } = createRepoMock();
    const useCases = createVentasUseCases({ ventasRepo: repo, baseDir: path.resolve(__dirname, '..', '..') });

    const result = await useCases.createOperacion({
      user: { id: 1, email: 'qa@novogar.local', permissions: ['acceso_total'] },
      sociedad_id: 1,
      proyecto_codigo: 'ede',
      unidad_codigo: 'a01',
      cliente_nombre: 'Cliente QA',
      cliente_identificacion: '506123',
      usuario: 'qa',
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();

    expect(repo.upsertUnidad).toHaveBeenCalledWith(
      {
        sociedadId: 1,
        proyectoCodigo: 'EDE',
        unidadCodigo: 'A01',
      },
      client,
    );
    expect(repo.findActiveOperacionByUnidadId).toHaveBeenCalledWith(10, client);
    expect(repo.createOperacion).toHaveBeenCalledWith(
      expect.objectContaining({
        unidadId: 10,
        estado: VENTA_OPERACION_ESTADOS.ACTIVA,
        clienteNombre: 'Cliente QA',
      }),
      client,
    );
    expect(repo.insertOperacionHistorial).toHaveBeenCalledWith(
      expect.objectContaining({
        operacionId: result.id,
        estadoNuevo: VENTA_OPERACION_ESTADOS.ACTIVA,
      }),
      client,
    );
  });

  test('transferOperacion traslada origen y crea destino activo', async () => {
    const { repo, client } = createRepoMock({
      getOperacionById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 100,
          unidad_id: 10,
          sociedad_id: 1,
          proyecto_codigo: 'EDE',
          unidad_codigo: 'A01',
          cliente_nombre: 'CLIENTE BASE',
          cliente_identificacion: '123',
          estado: VENTA_OPERACION_ESTADOS.ACTIVA,
          metadata: null,
        }),
      upsertUnidad: jest
        .fn()
        .mockResolvedValueOnce({ id: 20, sociedad_id: 1, proyecto_codigo: 'ASF', unidad_codigo: 'B02' }),
      findActiveOperacionByUnidadId: jest.fn().mockResolvedValue(null),
      updateOperacionEstado: jest.fn().mockResolvedValue({
        id: 100,
        unidad_id: 10,
        sociedad_id: 1,
        proyecto_codigo: 'EDE',
        unidad_codigo: 'A01',
        cliente_nombre: 'CLIENTE BASE',
        estado: VENTA_OPERACION_ESTADOS.TRASLADADA,
      }),
      createOperacion: jest.fn().mockResolvedValue({
        id: 201,
        unidad_id: 20,
        sociedad_id: 1,
        proyecto_codigo: 'ASF',
        unidad_codigo: 'B02',
        cliente_nombre: 'CLIENTE BASE',
        estado: VENTA_OPERACION_ESTADOS.ACTIVA,
        origen_operacion_id: 100,
      }),
    });
    const useCases = createVentasUseCases({ ventasRepo: repo, baseDir: path.resolve(__dirname, '..', '..') });

    const result = await useCases.transferOperacion({
      user: { id: 1, email: 'qa@novogar.local', permissions: ['acceso_total'] },
      operacionId: 100,
      destino_proyecto_codigo: 'asf',
      destino_unidad_codigo: 'b02',
      motivo: 'Traslado QA',
      usuario: 'qa',
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();

    expect(repo.updateOperacionEstado).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 100,
        estado: VENTA_OPERACION_ESTADOS.TRASLADADA,
      }),
      client,
    );
    expect(repo.createOperacion).toHaveBeenCalledWith(
      expect.objectContaining({
        unidadId: 20,
        estado: VENTA_OPERACION_ESTADOS.ACTIVA,
        origenOperacionId: 100,
      }),
      client,
    );
    expect(result).toMatchObject({
      origen: expect.objectContaining({ id: 100 }),
      destino: expect.objectContaining({ id: 201 }),
    });
  });

  test('syncOperacionDocumento crea operacion activa y registra documento cuando no existe operacion', async () => {
    const { repo, client } = createRepoMock({
      findActiveOperacionByUnidadId: jest.fn().mockResolvedValue(null),
      createOperacion: jest.fn().mockResolvedValue({
        id: 301,
        unidad_id: 10,
        sociedad_id: 1,
        proyecto_codigo: 'ASF',
        unidad_codigo: 'A01',
        cliente_nombre: 'CLIENTE NUEVO',
        estado: VENTA_OPERACION_ESTADOS.ACTIVA,
      }),
      getOperacionById: jest.fn().mockResolvedValue({
        id: 301,
        unidad_id: 10,
        sociedad_id: 1,
        proyecto_codigo: 'ASF',
        unidad_codigo: 'A01',
        cliente_nombre: 'CLIENTE NUEVO',
        estado: VENTA_OPERACION_ESTADOS.ACTIVA,
      }),
      upsertOperacionDocumento: jest.fn().mockResolvedValue({
        id: 55,
        operacion_id: 301,
        codigo_documento: 'PAGO_RESERVA',
      }),
    });
    const useCases = createVentasUseCases({ ventasRepo: repo, baseDir: path.resolve(__dirname, '..', '..') });

    const result = await useCases.syncOperacionDocumento({
      user: { id: 1, email: 'qa@novogar.local', permissions: ['acceso_total'] },
      proyecto_codigo: 'asf',
      unidad_codigo: 'a01',
      cliente_nombre: 'Cliente Nuevo',
      codigo_documento: 'PAGO_RESERVA',
      nombre_archivo: 'PAGO_RESERVA.pdf',
      ruta_archivo: 'C:/tmp/PAGO_RESERVA.pdf',
      usuario: 'qa',
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(repo.createOperacion).toHaveBeenCalledTimes(1);
    expect(repo.upsertOperacionDocumento).toHaveBeenCalledWith(
      expect.objectContaining({
        operacionId: 301,
        codigoDocumento: 'PAGO_RESERVA',
      }),
      client,
    );
    expect(result).toMatchObject({
      operacion: expect.objectContaining({ id: 301 }),
      documento: expect.objectContaining({ id: 55 }),
      operacion_creada: true,
    });
  });
});
