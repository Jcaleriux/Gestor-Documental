import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacturasViewScope,
  buildScopedPanelVisible,
} from '../../src/components/facturas/facturasUiState.js';

test('facturasUiState construye el scope por sociedad y dashboardPreset', () => {
  assert.equal(
    buildFacturasViewScope({
      sociedadId: 18,
      dashboardPreset: 'vencidas',
    }),
    '18::vencidas',
  );
});

test('facturasUiState solo mantiene visible el panel si coincide el scope actual', () => {
  assert.equal(
    buildScopedPanelVisible({
      scope: '18::vencidas',
      state: {
        scope: '18::vencidas',
        visible: true,
      },
    }),
    true,
  );

  assert.equal(
    buildScopedPanelVisible({
      scope: '18::vencidas',
      state: {
        scope: '18::pagadas',
        visible: true,
      },
    }),
    false,
  );
});
