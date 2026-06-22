import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatDateTime } from '../../src/utils/formatters.js';

test('formatDate usa formato de Costa Rica para fechas ISO con hora', () => {
  assert.equal(formatDate('2026-06-22T10:45:00'), '22/6/2026');
});

test('formatDate trata YYYY-MM-DD como fecha local sin corrimiento por zona horaria', () => {
  assert.equal(formatDate('2026-06-22'), '22/6/2026');
});

test('formatDateTime usa orden dia mes anio', () => {
  assert.match(formatDateTime('2026-06-22T10:45:00'), /^22\/6\/2026/);
});
