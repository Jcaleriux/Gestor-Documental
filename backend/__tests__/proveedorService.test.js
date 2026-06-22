jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const {
  extraerProveedorDesdeEmisor,
  normalizarIdentificacion,
  upsertProveedorDesdeEmisor
} = require('../services/proveedor.service');

describe('proveedor.service', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('normaliza identificaciones removiendo separadores y usando mayusculas', () => {
    expect(normalizarIdentificacion(' 3-101-abc ')).toBe('3101ABC');
  });

  test('extrae proveedor desde el emisor de un comprobante', () => {
    expect(extraerProveedorDesdeEmisor({
      Nombre: 'Proveedor QA',
      NombreComercial: 'Proveedor Comercial',
      Identificacion: {
        Tipo: '02',
        Numero: '3-101-123456'
      },
      CorreoElectronico: 'proveedor@example.com',
      Telefono: {
        CodigoPais: '506',
        NumTelefono: '22223333'
      }
    })).toEqual({
      identificacionTipo: '02',
      identificacionNumero: '3-101-123456',
      identificacionNumeroNormalizado: '3101123456',
      nombre: 'Proveedor QA',
      nombreComercial: 'Proveedor Comercial',
      correoElectronico: 'proveedor@example.com',
      telefonoCodigoPais: '506',
      telefonoNumero: '22223333'
    });
  });

  test('omite emisores sin datos minimos', async () => {
    await expect(upsertProveedorDesdeEmisor({ Nombre: 'Sin cedula' }, 1))
      .resolves.toEqual({ status: 'skipped', id: null });

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('solo actualiza proveedor cuando algun dato efectivo cambia', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 7, changed: false, action: 'unchanged', changes_logged: 0 }]
    });

    await expect(upsertProveedorDesdeEmisor({
      Nombre: 'Proveedor QA',
      Identificacion: {
        Tipo: '02',
        Numero: '3-101-123456'
      }
    }, 1, { origen: 'documento:506123' })).resolves.toEqual({
      status: 'unchanged',
      id: 7,
      action: 'unchanged',
      changesLogged: 0
    });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (sociedad_id, identificacion_numero_normalizado)');
    expect(sql).toContain('WHERE (EXCLUDED.identificacion_tipo IS NOT NULL');
    expect(sql).toContain('IS DISTINCT FROM proveedores.nombre');
    expect(sql).toContain('INSERT INTO proveedores_historial_cambios');
    expect(params).toEqual([
      1,
      '02',
      '3-101-123456',
      '3101123456',
      'Proveedor QA',
      null,
      null,
      null,
      null,
      'documento:506123'
    ]);
  });

  test('reporta upserted cuando inserta o actualiza proveedor', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 8, changed: true, action: 'updated', changes_logged: 2 }]
    });

    await expect(upsertProveedorDesdeEmisor({
      Nombre: 'Proveedor QA',
      Identificacion: {
        Tipo: '02',
        Numero: '3101123456'
      }
    }, 1)).resolves.toEqual({
      status: 'upserted',
      id: 8,
      action: 'updated',
      changesLogged: 2
    });
  });
});
