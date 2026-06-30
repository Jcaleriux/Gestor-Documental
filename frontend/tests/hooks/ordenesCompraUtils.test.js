import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAmount,
  formatDateOnly,
  formatDateTime,
  proveedorLabel,
  toBase64
} from '../../src/hooks/ordenesCompra/utils.js';

const installFileReader = ({ result, shouldFail = false }) => {
  const previousFileReader = globalThis.FileReader;

  globalThis.FileReader = class {
    readAsDataURL() {
      queueMicrotask(() => {
        if (shouldFail) {
          this.onerror();
          return;
        }
        this.result = result;
        this.onload();
      });
    }
  };

  return () => {
    globalThis.FileReader = previousFileReader;
  };
};

test('ordenesCompra utils convierte archivos a base64 limpio', async () => {
  const restore = installFileReader({
    result: 'data:application/pdf;base64,PDF_BASE64'
  });
  try {
    await assert.doesNotReject(async () => {
      const value = await toBase64({ name: 'orden.pdf' });
      assert.equal(value, 'PDF_BASE64');
    });
  } finally {
    restore();
  }
});

test('ordenesCompra utils propaga error de lectura de archivo', async () => {
  const restore = installFileReader({
    result: '',
    shouldFail: true
  });
  try {
    await assert.rejects(
      () => toBase64({ name: 'orden.pdf' }),
      /No se pudo leer el archivo/
    );
  } finally {
    restore();
  }
});

test('ordenesCompra utils formatea fechas, montos y proveedor', () => {
  assert.equal(formatDateOnly('2026-03-22'), '22/03/2026');
  assert.match(formatDateTime('2026-03-22T12:30:00.000Z'), /22\/3\/2026/);
  assert.match(formatAmount(1234.5).replace(/\s/g, ''), /1234[,.]50/);
  assert.equal(formatAmount('monto invalido'), '-');
  assert.equal(proveedorLabel({
    nombre: 'Proveedor Norte',
    identificacion_numero: '3101234567'
  }), 'Proveedor Norte - 3101234567');
});
