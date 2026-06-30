jest.mock('../db', () => ({
  query: jest.fn()
}));

const pool = require('../db');
const {
  buildStoredPathCandidates,
  listDocumentResourcesByPath
} = require('../repositories/documentResourceRepository');

describe('documentResourceRepository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  test('buildStoredPathCandidates conserva ruta relativa y deriva absoluta bajo documentos', () => {
    expect(buildStoredPathCandidates('C:/repo/documentos/facturas procesadas/demo.pdf'))
      .toContain('documentos/facturas procesadas/demo.pdf');
    expect(buildStoredPathCandidates('facturas/procesadas/demo.pdf'))
      .toContain('documentos/facturas procesadas/demo.pdf');
  });

  test('listDocumentResourcesByPath consulta recursos PDF registrados', async () => {
    pool.query.mockResolvedValue({
      rows: [{ resource_type: 'factura_pdf', resource_id: 1, sociedad_id: 10 }]
    });

    const rows = await listDocumentResourcesByPath({
      rawPath: 'documentos/facturas procesadas/demo.pdf',
      kind: 'pdf'
    });

    expect(rows).toEqual([{ resource_type: 'factura_pdf', resource_id: 1, sociedad_id: 10 }]);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('factura_pdf'),
      [expect.arrayContaining(['documentos/facturas procesadas/demo.pdf'])]
    );
  });

  test('listDocumentResourcesByPath consulta recursos XML registrados', async () => {
    pool.query.mockResolvedValue({
      rows: [{ resource_type: 'factura_xml', resource_id: 1, sociedad_id: 10 }]
    });

    await listDocumentResourcesByPath({
      rawPath: 'documentos/facturas procesadas/demo.xml',
      kind: 'xml'
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('factura_xml'),
      [expect.arrayContaining(['documentos/facturas procesadas/demo.xml'])]
    );
  });
});
