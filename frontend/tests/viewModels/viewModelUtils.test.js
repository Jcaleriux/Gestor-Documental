import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContabilizacionTotals,
  buildFileUrl,
  buildMonedaFactura,
  toNonNegativeNumber
} from '../../src/components/facturaDetalle/viewModels/viewModelUtils.js';

const setLocalStorageMock = ({ token = '' } = {}) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      if (key === 'novogar_auth_token') return token;
      return null;
    },
    setItem() {},
    removeItem() {}
  };
  return () => {
    globalThis.localStorage = previous;
  };
};

test('toNonNegativeNumber convierte valores invalidos o negativos a 0', () => {
  assert.equal(toNonNegativeNumber('12.5'), 12.5);
  assert.equal(toNonNegativeNumber(0), 0);
  assert.equal(toNonNegativeNumber(-1), 0);
  assert.equal(toNonNegativeNumber('abc'), 0);
  assert.equal(toNonNegativeNumber(null), 0);
});

test('buildMonedaFactura resuelve moneda con prioridad esperada y fallback CRC', () => {
  assert.equal(
    buildMonedaFactura({ resumen: { CodigoTipoMoneda: { CodigoMoneda: 'USD' } } }),
    'USD'
  );
  assert.equal(buildMonedaFactura({ resumen: { CodigoMoneda: 'EUR' } }), 'EUR');
  assert.equal(buildMonedaFactura({ resumen: { codigoMoneda: 'MXN' } }), 'MXN');
  assert.equal(buildMonedaFactura({ resumen: {} }), 'CRC');
});

test('buildContabilizacionTotals calcula totales de pago y retencion', () => {
  const totals = buildContabilizacionTotals({
    factura: { resumen: { TotalComprobante: 1000 } },
    conta: {
      descuento: 100,
      anticipo_aplicado: 50,
      monto_nota_credito: 25,
      retencion: 75,
      retencion_pagada: 30
    }
  });

  assert.deepEqual(totals, {
    totalFactura: 1000,
    rebajosAplicados: 175,
    retencionTotal: 75,
    totalPagoPrincipal: 750,
    retencionPagada: 30,
    retencionPendiente: 45,
    totalPendienteGlobal: 795
  });
});

test('buildFileUrl genera la ruta del recurso sin exponer token', () => {
  const restore = setLocalStorageMock({ token: 'abc 123' });
  try {
    const url = buildFileUrl({
      endpoint: '/api/files/pdf',
      ruta: 'docs/facturas/archivo uno.pdf'
    });

    assert.equal(
      url,
      '/api/files/pdf?path=docs%2Ffacturas%2Farchivo%20uno.pdf'
    );
  } finally {
    restore();
  }
});

test('buildFileUrl retorna vacio cuando no hay ruta', () => {
  const restore = setLocalStorageMock();
  try {
    assert.equal(buildFileUrl({ endpoint: '/api/files/pdf', ruta: '' }), '');
    assert.equal(buildFileUrl({ endpoint: '/api/files/pdf', ruta: null }), '');
  } finally {
    restore();
  }
});
