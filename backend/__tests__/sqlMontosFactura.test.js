const {
  createNormalizedCurrencyExpression,
  createTotalPagoPrincipalExpression,
  createTotalPendienteGlobalExpression
} = require('../repositories/sqlMontosFactura');

describe('sqlMontosFactura', () => {
  test('createNormalizedCurrencyExpression aplica epsilon y redondeo monetario', () => {
    const expression = createNormalizedCurrencyExpression('saldo_raw');

    expect(expression).toContain('ABS(saldo_raw) < 0.005');
    expect(expression).toContain('THEN 0');
    expect(expression).toContain('ROUND(saldo_raw, 2)');
  });

  test('createTotalPagoPrincipalExpression normaliza residuos monetarios', () => {
    const expression = createTotalPagoPrincipalExpression({ facturaAlias: 'f', contaAlias: 'fc' });

    expect(expression).toContain('ABS((');
    expect(expression).toContain("SELECT SUM(fp.monto)");
    expect(expression).toContain('ROUND((');
    expect(expression).toContain('0.005');
  });

  test('createTotalPendienteGlobalExpression devuelve pendiente global normalizado', () => {
    const expression = createTotalPendienteGlobalExpression({ facturaAlias: 'f', contaAlias: 'fc' });

    expect(expression).toContain('ABS((');
    expect(expression).toContain('ROUND((');
    expect(expression).toContain('0.005');
  });
});
