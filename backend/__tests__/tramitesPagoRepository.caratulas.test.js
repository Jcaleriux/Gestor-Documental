const repo = require('../repositories/tramitesPagoRepository');

describe('tramitesPagoRepository caratulas payload mapping', () => {
  test('upsertTramiteCaratulaProvider acepta payload en snake_case', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 21 }] })
    };

    await repo.upsertTramiteCaratulaProvider({
      tramiteId: 4,
      provider_key: 'id:77',
      proveedor_id: 77,
      proveedor_nombre: 'CONSTRUPLAZA SOCIEDAD ANONIMA',
      proveedor_identificacion: '3101289562',
      provider_raw_name: 'CONSTRUPLAZA SOCIEDAD ANONIMA',
      provider_raw_identification: '3101289562',
      provider_code: null,
      nombre_archivo: '20.bsp_crc_CONSTRUPLAZA.pdf',
      ruta_archivo: 'documentos/tramites/caratulas/10/4/providers/20.bsp_crc_CONSTRUPLAZA.pdf',
      attachment_status: 'pendiente_confirmacion',
      attachment_origin: 'auto',
      order_status: 'no_requerido',
      execution_date: '2026-03-12',
      currency: 'CRC',
      page_start: 1,
      page_end: 1,
      page_numbers: [1],
      warnings: [],
      group_payload: { version: 2, page_numbers: [1], lines: [] },
      order_confirmed_by: null,
      order_confirmed_at: null,
      attachment_confirmed_by: null,
      attachment_confirmed_at: null
    }, client);

    expect(client.query).toHaveBeenCalledTimes(1);
    const [, values] = client.query.mock.calls[0];
    expect(values[0]).toBe(4);
    expect(values[1]).toBe('id:77');
    expect(values[2]).toBe(77);
    expect(values[3]).toBe('CONSTRUPLAZA SOCIEDAD ANONIMA');
    expect(values[9]).toBe('documentos/tramites/caratulas/10/4/providers/20.bsp_crc_CONSTRUPLAZA.pdf');
    expect(values[10]).toBe('pendiente_confirmacion');
    expect(values[11]).toBe('auto');
  });

  test('insertTramiteCaratulaOrphan acepta payload en snake_case', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 31 }] })
    };

    await repo.insertTramiteCaratulaOrphan({
      tramiteId: 4,
      provider_raw_name: 'Proveedor sin resolver',
      provider_raw_identification: '3101555555',
      provider_code: 'P00999',
      nombre_archivo: '20.bsp_crc_huerfana.pdf',
      ruta_archivo: 'documentos/tramites/caratulas/10/4/orphans/20.bsp_crc_huerfana.pdf',
      execution_date: '2026-03-12',
      currency: 'CRC',
      page_start: 2,
      page_end: 3,
      page_numbers: [2, 3],
      warnings: ['Sin match'],
      group_payload: { version: 2, page_numbers: [2, 3], lines: [] },
      status: 'pendiente'
    }, client);

    expect(client.query).toHaveBeenCalledTimes(1);
    const [, values] = client.query.mock.calls[0];
    expect(values[0]).toBe(4);
    expect(values[1]).toBe('Proveedor sin resolver');
    expect(values[2]).toBe('3101555555');
    expect(values[3]).toBe('P00999');
    expect(values[4]).toBe('20.bsp_crc_huerfana.pdf');
    expect(values[5]).toBe('documentos/tramites/caratulas/10/4/orphans/20.bsp_crc_huerfana.pdf');
    expect(values[13]).toBe('pendiente');
  });
});
