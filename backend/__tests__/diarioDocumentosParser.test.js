const {
  extractLast11Digits,
  parseDiarioDocumentosText
} = require('../services/diarioDocumentosParser');

describe('diarioDocumentosParser', () => {
  test('extrae ultimos 11 digitos y rellena referencias cortas', () => {
    expect(extractLast11Digits('00100001010000007326')).toBe('10000007326');
    expect(extractLast11Digits('536')).toBe('00000000536');
    expect(extractLast11Digits('IPJ 2026')).toBe('00000002026');
  });

  test('agrupa asiento y lee columnas finales aunque comentarios tengan comas internas', () => {
    const text = [
      'Nº sec.,Nº de transacción,Fecha de contabilización,Serie,Nº documento,Código de transacción,Cuenta asociada,Nombre de cuenta asociada,Cuenta de mayor/Código SN,Cuenta de mayor/Nombre SN,Cargo (ML) (moneda),Cargo (ML),Abono (ML) (moneda),Abono (ML),Débito (MS) (moneda),Débito (MS),Crédito (MS) (moneda),Crédito (MS),Comentarios,Cuenta de contrapartida,Centro de Costo,Referencia 1 (Cabecera),Referencia 2 (Cabecera),',
      '26,2594,26/01/2026,Primario,TT 536,,,,,,,,,,,,,,Transporte de agua potable, mitigacion de polvo.,,,536,10000011604,',
      ',,26/01/2026,,,,11502106,Costo,11502106,Costo,CRC,120000.00,,,USD,239.89,,,Transporte de agua potable, mitigacion de polvo.,P00705,11Z0606,536,10000011604,',
      '27,2595,27/01/2026,Primario,TT 537,,,,,,,,,,,,,,Servicio,,,537,10000011605,',
      ',,27/01/2026,,,,5000,Gasto,5000,Gasto,CRC,1,,,USD,1,,,Servicio,P001,11Y0714,537,10000011605,',
      ',,27/01/2026,,,,5001,Gasto,5001,Gasto,CRC,1,,,USD,1,,,Servicio,P001,11Y0725,537,10000011605,'
    ].join('\n');

    const parsed = parseDiarioDocumentosText(text);

    expect(parsed.malformedRows).toBe(2);
    expect(parsed.asientos).toHaveLength(2);
    expect(parsed.asientos[0]).toMatchObject({
      asiento: '2594',
      referencia2: '10000011604',
      factura11: '10000011604',
      centros_costo_codigos: ['11Z0606']
    });
    expect(parsed.asientos[1]).toMatchObject({
      asiento: '2595',
      factura11: '10000011605',
      centros_costo_codigos: ['11Y0714', '11Y0725']
    });
  });

  test('extrae proveedor desde las columnas de codigo y nombre SN', () => {
    const text = [
      'sec,asiento,fecha,serie,documento,tipo,cuenta,nombre cuenta,codigo sn,nombre sn,cargo moneda,cargo,abono moneda,abono,debito moneda,debito,credito moneda,credito,comentarios,contrapartida,centro,ref1,ref2,',
      '1,3377,18/03/2026,Primario,TT 761,,,,,,,,,,,,,,Servicio,,,761,10000000078,',
      ',,18/03/2026,,,,21101001,Proveedores locales,P00813,QUIIVEN VENTAS INMOBILIARIAS COSTA RICA SRL,,,CRC,584930.94,,,USD,1243.00,Servicio,11502307,,761,10000000078,'
    ].join('\n');

    const parsed = parseDiarioDocumentosText(text);

    expect(parsed.asientos[0]).toMatchObject({
      asiento: '3377',
      proveedor_codigos: ['P00813'],
      proveedor_nombres: ['QUIIVEN VENTAS INMOBILIARIAS COSTA RICA SRL']
    });
  });
});
