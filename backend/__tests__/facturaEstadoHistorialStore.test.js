jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const { FACTURA_ESTADO_DOMINIOS } = require('../domain/facturas');
const { createFacturaEstadoHistorial } = require('../repositories/facturaEstadoHistorialStore');

describe('facturaEstadoHistorialStore', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [{ id: 1, factura_id: 7 }] });
  });

  test('documental inserta solo en historial dedicado', async () => {
    const result = await createFacturaEstadoHistorial({
      facturaId: 7,
      dominio: FACTURA_ESTADO_DOMINIOS.CONTABILIZACION,
      estadoAnterior: 'no_contabilizado',
      estadoNuevo: 'contabilizado',
      usuario: 'conta@sendadocs.local',
      motivo: 'Contabilizacion inicial'
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO facturas_estado_documental_historial');
    expect(result).toMatchObject({
      dominio: FACTURA_ESTADO_DOMINIOS.CONTABILIZACION,
      origen_historial: 'facturas_estado_documental_historial'
    });
  });

  test('workflow inserta solo en historial dedicado', async () => {
    const result = await createFacturaEstadoHistorial({
      facturaId: 8,
      dominio: FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO,
      estadoAnterior: 'contabilizado',
      estadoNuevo: 'en_tramite_pago',
      usuario: 'tesoreria@sendadocs.local',
      motivo: 'Enviado a pago'
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO facturas_workflow_pago_historial');
    expect(result).toMatchObject({
      dominio: FACTURA_ESTADO_DOMINIOS.WORKFLOW_PAGO,
      origen_historial: 'facturas_workflow_pago_historial'
    });
  });

  test('dominio mixto usa historial dedicado propio', async () => {
    const result = await createFacturaEstadoHistorial({
      facturaId: 9,
      dominio: FACTURA_ESTADO_DOMINIOS.MIXTO,
      estadoAnterior: 'contabilizado',
      estadoNuevo: 'en_tramite_pago',
      usuario: 'sistema',
      motivo: 'Migracion legacy'
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO facturas_estado_mixto_historial');
    expect(result).toMatchObject({
      dominio: FACTURA_ESTADO_DOMINIOS.MIXTO,
      origen_historial: 'facturas_estado_mixto_historial'
    });
  });
});
