jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const proveedoresRepository = require('../repositories/proveedoresRepository');

describe('proveedoresRepository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('listProveedorHistorialCambios consulta historial ordenado por fecha', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, proveedor_id: 7 }] });

    await expect(proveedoresRepository.listProveedorHistorialCambios({
      proveedorId: 7
    })).resolves.toEqual([{ id: 1, proveedor_id: 7 }]);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM proveedores_historial_cambios');
    expect(sql).toContain('ORDER BY creado_en DESC, id DESC');
    expect(params).toEqual([7, 100]);
  });

  test('updateProveedor registra cambios manuales en historial', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [{ id: 7, nombre: 'Proveedor QA' }] });

    await expect(proveedoresRepository.updateProveedor({
      id: 7,
      identificacionTipo: '02',
      identificacionNumero: '3101123456',
      identificacionNumeroNormalizado: '3101123456',
      nombre: 'Proveedor QA',
      nombreComercial: null,
      correoElectronico: 'qa@example.com',
      telefonoCodigoPais: '506',
      telefonoNumero: '22223333'
    })).resolves.toEqual({ id: 7, nombre: 'Proveedor QA' });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO proveedores_historial_cambios');
    expect(sql).toContain("'admin_proveedores'");
    expect(sql).toContain('WHERE changed.valor_nuevo IS DISTINCT FROM changed.valor_anterior');
    expect(params).toEqual([
      '02',
      '3101123456',
      '3101123456',
      'Proveedor QA',
      null,
      'qa@example.com',
      '506',
      '22223333',
      7
    ]);
  });
});
