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

const createRawStreamPdfBuffer = (segments) => Buffer.from([
  '%PDF-1.4',
  '<< /Length 1 >>',
  'stream',
  ...segments.map((segment) => `(${segment})`),
  'endstream',
  '%%EOF'
].join('\r\n'), 'latin1');

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

  test('decodifica literales PDF escapados', () => {
    const pdfBuffer = createLiteralPdfBuffer([
      'Orden de Compra ' + '\\' + '060' + '\\' + '060' + '123',
      'Fecha:' + '\\' + 't' + '20/04/2026',
      'Proveedor: Servicios Norte ' + '\\(' + 'CR' + '\\)',
      'Total' + '\\' + 'n' + 'USD 2.500,00'
    ]);

    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores: [
        {
          id: 11,
          nombre: 'Servicios Norte',
          identificacion_numero: '3101000000'
        }
      ]
    });

    expect(result).toMatchObject({
      numeroOc: '00123',
      fecha: '2026-04-20',
      moneda: 'USD',
      monto: 2500,
      proveedor: expect.objectContaining({ id: 11 }),
      proveedorMatchType: 'nombre',
      proveedorMatchConfidence: 1
    });
  });

  test('lee streams sin compresion con encabezado CRLF y deduplica segmentos', () => {
    const pdfBuffer = createRawStreamPdfBuffer([
      'Orden de Compra 999',
      'Orden de Compra 999',
      'Fecha: 25/05/2026',
      'Colones',
      'Total 1.234'
    ]);

    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores: []
    });

    expect(result).toMatchObject({
      numeroOc: '999',
      fecha: '2026-05-25',
      moneda: 'CRC',
      monto: 1234
    });
  });

  test('ignora streams sin cierre y usa literales restantes del PDF', () => {
    const pdfBuffer = Buffer.from([
      '%PDF-1.4',
      'stream',
      '(contenido de stream incompleto)',
      '(Orden: 4567)',
      '(Fecha: 10/07/2026)',
      '(Total 987,65)',
      '(CRC)'
    ].join('\n'), 'latin1');

    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores: []
    });

    expect(result).toMatchObject({
      numeroOc: '4567',
      fecha: '2026-07-10',
      moneda: 'CRC',
      monto: 987.65
    });
  });

  test('usa fallback por linea para numero de orden con texto intermedio', () => {
    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer: createLiteralPdfBuffer([
        'Orden de Compra ref 4455',
        'Fecha: 05/08/2026',
        'Total 3.210'
      ]),
      proveedores: []
    });

    expect(result).toMatchObject({
      numeroOc: '4455',
      fecha: '2026-08-05',
      monto: 3210
    });
  });

  test('rechaza fechas fuera de rango y montos no positivos', () => {
    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer: createLiteralPdfBuffer([
        'OC: 1212',
        'Fecha: 32/13/2026',
        'Total 0.00',
        'Proveedor: A B C'
      ]),
      proveedores: [
        {
          id: 1,
          nombre: 'A B D',
          identificacion_numero: '3101000000'
        }
      ]
    });

    expect(result).toMatchObject({
      numeroOc: '1212',
      fecha: null,
      monto: null,
      proveedor: null,
      proveedorMatchType: null,
      proveedorMatchConfidence: 0
    });
  });

  test('retorna numero nulo cuando solo encuentra la etiqueta orden sin digitos', () => {
    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer: createLiteralPdfBuffer([
        'Orden de Compra pendiente',
        'Fecha: 01/12/2026',
        'Total 100.00'
      ]),
      proveedores: []
    });

    expect(result).toMatchObject({
      numeroOc: null,
      fecha: '2026-12-01',
      monto: 100
    });
  });

  test('detecta total separado de la etiqueta y proveedor por tokens compartidos', () => {
    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer: createLiteralPdfBuffer([
        'OC: 3434',
        'Fecha: 15/09/2026',
        'Total',
        'USD 333.33',
        'Proveedor: Servicios Norte'
      ]),
      proveedores: [
        {
          id: 19,
          identificacion_numero: '3101999000'
        },
        {
          id: 20,
          nombre: 'Servicios Pacifico',
          identificacion_numero: '3101888000'
        }
      ]
    });

    expect(result).toMatchObject({
      numeroOc: '3434',
      fecha: '2026-09-15',
      moneda: 'USD',
      monto: 333.33,
      proveedor: expect.objectContaining({ id: 20 }),
      proveedorMatchType: 'nombre',
      proveedorMatchConfidence: 0.5
    });
  });

  test('usa candidatos posteriores de proveedor y nombre comercial como fallback', () => {
    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer: createLiteralPdfBuffer([
        'OC: 5656',
        'Fecha: 2026/10/15',
        'Proveedor:',
        'Contacto de compras',
        'Insumos Especiales',
        'Total CRC 75,25'
      ]),
      proveedores: [
        {
          id: 30,
          nombre_comercial: 'Insumos Especiales',
          identificacion_numero: '3101777000'
        }
      ]
    });

    expect(result).toMatchObject({
      numeroOc: '5656',
      fecha: '2026-10-15',
      moneda: 'CRC',
      monto: 75.25,
      proveedor: expect.objectContaining({ id: 30 }),
      proveedorMatchType: 'nombre',
      proveedorMatchConfidence: 1
    });
  });

  test('prioriza identificacion normalizada cuando el PDF trae identificacion generica', () => {
    const result = extractOrdenCompraDataFromPdf({
      pdfBuffer: createLiteralPdfBuffer([
        'Orden: 7878',
        'Fecha: 11-11-2026',
        'Identificacion: 3 101 777000',
        'Proveedor: Otro nombre',
        'Total USD 5,000'
      ]),
      proveedores: [
        {
          id: 40,
          nombre: 'Proveedor por identificacion',
          identificacion_numero_normalizado: '3101777000'
        }
      ]
    });

    expect(result).toMatchObject({
      numeroOc: '7878',
      fecha: '2026-11-11',
      moneda: 'USD',
      monto: 5000,
      proveedor: expect.objectContaining({ id: 40 }),
      proveedorMatchType: 'identificacion',
      proveedorMatchConfidence: 1
    });
  });
});
