const zlib = require('zlib');
const { extractOrdenCompraDataFromPdf } = require('../services/ordenesCompraAutoImportParser');

const createLiteralPdfBuffer = (segments) => Buffer.from([
  '%PDF-1.4',
  ...segments.map((segment) => `(${segment})`),
  '%%EOF'
].join('\n'), 'latin1');

const createFlateStreamPdfBuffer = (segments) => {
  const streamText = segments.map((segment) => `(${segment})`).join('\n');
  const compressed = zlib.deflateSync(Buffer.from(streamText, 'latin1'));

  return Buffer.concat([
    Buffer.from('%PDF-1.4\n<< /Filter /FlateDecode >>\nstream\n', 'latin1'),
    compressed,
    Buffer.from('\nendstream\n%%EOF', 'latin1')
  ]);
};

describe('ordenesCompraAutoImportParser', () => {
  test('extrae numero, fecha, moneda, monto y proveedor por identificacion', () => {
    const pdfBuffer = createLiteralPdfBuffer([
      'Orden de compra',
      'OC: 12345',
      'Fecha: 15/03/2026',
      'Proveedor: Proveedor Norte S.A.',
      'Cedula Juridica: 3-101-877955',
      'Total USD 1,234.56'
    ]);

    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores: [
        {
          id: 7,
          nombre: 'Proveedor Norte S.A.',
          identificacion_numero: '3101877955'
        }
      ]
    });

    expect(result).toMatchObject({
      numeroOc: '12345',
      fecha: '2026-03-15',
      moneda: 'USD',
      monto: 1234.56,
      proveedor: expect.objectContaining({ id: 7 }),
      proveedorMatchType: 'identificacion',
      proveedorMatchConfidence: 1
    });
  });

  test('lee streams FlateDecode y resuelve proveedor por nombre parcial', () => {
    const pdfBuffer = createFlateStreamPdfBuffer([
      'Orden de Compra 000777',
      'Fecha: 2026-03-15',
      'Proveedor: Uniformes Kelinda',
      'Total CRC 1.234.567,89'
    ]);

    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores: [
        {
          id: 9,
          nombre: 'Uniformes Kelinda Sociedad Anonima',
          identificacion_numero: '3101999888'
        }
      ]
    });

    expect(result).toMatchObject({
      numeroOc: '000777',
      fecha: '2026-03-15',
      moneda: 'CRC',
      monto: 1234567.89,
      proveedor: expect.objectContaining({ id: 9 }),
      proveedorMatchType: 'nombre',
      proveedorMatchConfidence: 0.85
    });
  });

  test('usa fecha valida secundaria y toma el mayor monto total disponible', () => {
    const pdfBuffer = createLiteralPdfBuffer([
      'OC # 888',
      'Fecha: 31/02/2026',
      'Entrega 05/04/2026',
      'Subtotal 100.00',
      'Total 250.00',
      'Total final 175.00',
      'Dolares'
    ]);

    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores: []
    });

    expect(result).toMatchObject({
      numeroOc: '888',
      fecha: '2026-04-05',
      moneda: 'USD',
      monto: 250,
      proveedor: null,
      proveedorMatchType: null,
      proveedorMatchConfidence: 0
    });
  });

  test('ignora streams comprimidos invalidos y cae al texto literal disponible', () => {
    const pdfBuffer = Buffer.from([
      '%PDF-1.4',
      '<< /Filter /FlateDecode >>',
      'stream',
      'contenido-no-comprimido',
      'endstream',
      '(OC: 4321)',
      '(Fecha: 01/06/26)',
      '(Colones)',
      '(Total 10,500)'
    ].join('\n'), 'latin1');

    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores: []
    });

    expect(result).toMatchObject({
      numeroOc: '4321',
      fecha: '2026-06-01',
      moneda: 'CRC',
      monto: 10500,
      proveedor: null
    });
  });

  test('retorna valores nulos cuando el PDF no contiene datos reconocibles', () => {
    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer: createLiteralPdfBuffer(['Archivo sin datos utiles']),
      proveedores: [{ id: 1, nombre: 'Proveedor sin coincidencia' }]
    });

    expect(result).toEqual({
      numeroOc: null,
      fecha: null,
      moneda: null,
      monto: null,
      proveedor: null,
      proveedorMatchType: null,
      proveedorMatchConfidence: 0
    });
  });
});
