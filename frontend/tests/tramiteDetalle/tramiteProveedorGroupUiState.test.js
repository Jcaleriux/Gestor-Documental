import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInitialLineSelections,
  buildInitialProviderFacturaId,
  buildScopedGroupStateValue,
  buildTramiteProveedorGroupScope,
} from '../../src/components/tramiteDetalle/tramiteProveedorGroupUiState.js';

test('tramiteProveedorGroupUiState construye factura inicial cuando hay proveedor resuelto', () => {
  assert.equal(
    buildInitialProviderFacturaId({
      proveedor_id: 18,
      documents: [{ factura_id: 91 }],
      available_documents: [{ factura_id: 92 }],
      provider_document_options: [{ factura_id: 93 }],
    }),
    '91',
  );
});

test('tramiteProveedorGroupUiState construye selections iniciales por linea', () => {
  assert.deepEqual(
    buildInitialLineSelections({
      lines: [
        { line_key: 'a', matched_factura_id: 10 },
        { line_key: 'b', matched_factura_id: null },
      ],
    }),
    {
      a: '10',
      b: '',
    },
  );
});

test('tramiteProveedorGroupUiState usa fallback cuando cambia el scope', () => {
  assert.equal(
    buildScopedGroupStateValue({
      scope: 'g-2',
      state: {
        scope: 'g-1',
        value: 'persistido',
      },
      fallback: 'inicial',
    }),
    'inicial',
  );
});

test('tramiteProveedorGroupUiState cambia scope cuando cambia el matching del grupo', () => {
  const initialScope = buildTramiteProveedorGroupScope({
    group_key: 'g-1',
    proveedor_id: 7,
    provider_document_options: [{ factura_id: 20 }],
    available_documents: [{ factura_id: 20 }],
    documents: [{ factura_id: 20 }],
    lines: [{ line_key: 'l1', matched_factura_id: null }],
  });
  const nextScope = buildTramiteProveedorGroupScope({
    group_key: 'g-1',
    proveedor_id: 7,
    provider_document_options: [{ factura_id: 20 }],
    available_documents: [{ factura_id: 20 }],
    documents: [{ factura_id: 20 }],
    lines: [{ line_key: 'l1', matched_factura_id: 55 }],
  });

  assert.notEqual(initialScope, nextScope);
});
