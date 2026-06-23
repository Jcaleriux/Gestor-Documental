import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatConsecutivo,
  formatDate,
  formatDateTime,
  getDocumentoConsecutivo,
} from '../../src/utils/formatters.js';

test('formatDate usa formato de Costa Rica para fechas ISO con hora', () => {
  assert.equal(formatDate('2026-06-22T10:45:00'), '22/6/2026');
});

test('formatDate trata YYYY-MM-DD como fecha local sin corrimiento por zona horaria', () => {
  assert.equal(formatDate('2026-06-22'), '22/6/2026');
});

test('formatDateTime usa orden dia mes anio', () => {
  assert.match(formatDateTime('2026-06-22T10:45:00'), /^22\/6\/2026/);
});

test('formatConsecutivo muestra solo los ultimos 11 digitos si el valor es largo', () => {
  assert.equal(formatConsecutivo('00200009010000173075'), '10000173075');
});

test('formatConsecutivo conserva valores cortos o no numericos', () => {
  assert.equal(formatConsecutivo('10000173075'), '10000173075');
  assert.equal(formatConsecutivo('F-001'), 'F-001');
});

test('getDocumentoConsecutivo usa factura_id antes del id de registros auxiliares', () => {
  assert.equal(getDocumentoConsecutivo({ id: 99, factura_id: 123, clave: '' }), '123');
});
