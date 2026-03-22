import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotasCreditoViewScope,
  buildScopedPanelVisible,
} from '../../src/components/notasCredito/notasCreditoUiState.js';

test('notasCreditoUiState construye el scope por sociedad', () => {
  assert.equal(
    buildNotasCreditoViewScope({
      sociedadId: 22,
    }),
    '22',
  );
});

test('notasCreditoUiState solo mantiene visible el panel si coincide el scope actual', () => {
  assert.equal(
    buildScopedPanelVisible({
      scope: '22',
      state: {
        scope: '22',
        visible: true,
      },
    }),
    true,
  );

  assert.equal(
    buildScopedPanelVisible({
      scope: '22',
      state: {
        scope: '18',
        visible: true,
      },
    }),
    false,
  );
});
