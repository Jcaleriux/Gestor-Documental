import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScopedPanelVisible,
  buildTiquetesViewScope,
} from '../../src/components/tiquetes/tiquetesUiState.js';

test('tiquetesUiState construye el scope por sociedad', () => {
  assert.equal(
    buildTiquetesViewScope({
      sociedadId: 31,
    }),
    '31',
  );
});

test('tiquetesUiState solo mantiene visible el panel si coincide el scope actual', () => {
  assert.equal(
    buildScopedPanelVisible({
      scope: '31',
      state: {
        scope: '31',
        visible: true,
      },
    }),
    true,
  );

  assert.equal(
    buildScopedPanelVisible({
      scope: '31',
      state: {
        scope: '14',
        visible: true,
      },
    }),
    false,
  );
});
