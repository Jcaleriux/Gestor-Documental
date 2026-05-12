const { parseXML } = require('../utils/xmlParser');

describe('xmlParser', () => {
  test('parsea XML valido de factura electronica sin romper la raiz', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica">
  <Clave>50601010100000000000100001010000000001111111111</Clave>
  <NumeroConsecutivo>00100001010000000001</NumeroConsecutivo>
</FacturaElectronica>`;

    const result = parseXML(xml);

    expect(result).toMatchObject({
      tipo: 'FacturaElectronica',
      data: {
        Clave: '50601010100000000000100001010000000001111111111',
        NumeroConsecutivo: '00100001010000000001',
      },
    });
  });

  test('rechaza XML con DTD o ENTITY por seguridad', () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<FacturaElectronica>
  <Clave>&xxe;</Clave>
</FacturaElectronica>`;

    expect(() => parseXML(xml)).toThrow('XML con DTD/ENTITY no soportado por seguridad');
  });
});
