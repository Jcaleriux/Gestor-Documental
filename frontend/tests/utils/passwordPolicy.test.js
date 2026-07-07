import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPasswordRequirementStates,
  isStrongPassword,
} from '../../src/utils/passwordPolicy.js';

test('isStrongPassword exige longitud y mezcla de caracteres', () => {
  assert.equal(isStrongPassword('corta'), false);
  assert.equal(isStrongPassword('largasinmayuscula1!'), false);
  assert.equal(isStrongPassword('LARGASINMINUSCULA1!'), false);
  assert.equal(isStrongPassword('LargaSinNumero!'), false);
  assert.equal(isStrongPassword('LargaSinSimbolo1'), false);
  assert.equal(isStrongPassword('ClaveFuerte2026!'), true);
});

test('getPasswordRequirementStates marca cada requisito', () => {
  const states = getPasswordRequirementStates('ClaveFuerte2026!');

  assert.deepEqual(states.map((state) => state.id), [
    'length',
    'lowercase',
    'uppercase',
    'number',
    'symbol',
  ]);
  assert.equal(states.every((state) => state.met), true);
});
