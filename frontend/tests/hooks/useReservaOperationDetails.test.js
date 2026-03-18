import test from 'node:test';
import assert from 'node:assert/strict';
import { useReservaOperationDetails } from '../../src/hooks/reservas/useReservaOperationDetails.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useReservaOperationDetailsHarness = (props) => useReservaOperationDetails(props);

const baseDetail = {
  operacion: { id: 10, estado: 'activa' },
  historial: [{ id: 1, accion: 'creada' }],
  documentos: [{ id: 5, codigo_documento: 'PAGO', nombre_archivo: 'pago.pdf', mime_type: 'application/pdf' }],
};

test('useReservaOperationDetails carga el detalle y selecciona el primer documento', async () => {
  const getOperacion = createMockFn(async () => ({
    data: {
      success: true,
      data: baseDetail,
    },
  }));

  const hook = createHookHarness({
    hook: useReservaOperationDetailsHarness,
    initialProps: {
      scopeKey: 'sociedad-10',
      dependencies: {
        api: {
          getOperacion,
          buildPreviewDocumentoUrl: () => '',
        },
      },
    },
  });

  await hook.result.toggleOperationDetail(10);
  await hook.flush({ cycles: 6 });

  assert.equal(getOperacion.calls.length, 1);
  assert.equal(hook.result.openDetailId, 10);
  assert.equal(hook.result.selectedDocumentByOperation[10], 5);
  assert.deepEqual(hook.result.operationDetails[10].historial, [{ id: 1, accion: 'creada' }]);
});

test('useReservaOperationDetails construye preview URL con y sin token', () => {
  const buildPreviewDocumentoUrl = createMockFn(({ operacionId, documentoId, token }) => (
    `${operacionId}:${documentoId}:${token || ''}`
  ));

  const withToken = createHookHarness({
    hook: useReservaOperationDetailsHarness,
    initialProps: {
      dependencies: {
        api: { buildPreviewDocumentoUrl, getOperacion: async () => ({ data: { success: true, data: baseDetail } }) },
        getToken: () => 'token-123',
      },
    },
  });

  assert.equal(
    withToken.result.buildPreviewUrl({ operacionId: 10, documentoId: 5 }),
    '10:5:token-123',
  );

  const withoutToken = createHookHarness({
    hook: useReservaOperationDetailsHarness,
    initialProps: {
      dependencies: {
        api: { buildPreviewDocumentoUrl, getOperacion: async () => ({ data: { success: true, data: baseDetail } }) },
        getToken: () => '',
      },
    },
  });

  assert.equal(
    withoutToken.result.buildPreviewUrl({ operacionId: 10, documentoId: 5 }),
    '10:5:',
  );
});

test('useReservaOperationDetails reemplaza documento y recarga el detalle', async () => {
  const getOperacion = createMockFn(async () => ({
    data: {
      success: true,
      data: baseDetail,
    },
  }));
  const replaceDocumento = createMockFn(async () => ({
    data: {
      success: true,
      data: {
        documento: { id: 5, nombre_archivo: 'nuevo.pdf' },
      },
    },
  }));
  const readFile = createMockFn(async () => 'data:application/pdf;base64,SGVsbG8=');

  const hook = createHookHarness({
    hook: useReservaOperationDetailsHarness,
    initialProps: {
      scopeKey: 'sociedad-10',
      dependencies: {
        api: {
          getOperacion,
          replaceDocumento,
          buildPreviewDocumentoUrl: () => '',
        },
        readFile,
      },
    },
  });

  await hook.result.toggleOperationDetail(10);
  await hook.flush({ cycles: 6 });

  await hook.result.replaceDocument({
    operacionId: 10,
    documentoId: 5,
    file: {
      name: 'nuevo.pdf',
      type: 'application/pdf',
    },
    motivo: 'Actualizacion',
  });
  await hook.flush({ cycles: 6 });

  assert.equal(readFile.calls.length, 1);
  assert.equal(replaceDocumento.calls.length, 1);
  assert.equal(getOperacion.calls.length, 2);
  assert.equal(hook.result.message, 'Documento reemplazado correctamente. Se registro en historial.');
});

test('useReservaOperationDetails valida que exista archivo antes de reemplazar', async () => {
  const hook = createHookHarness({
    hook: useReservaOperationDetailsHarness,
    initialProps: {
      dependencies: {
        api: {
          getOperacion: async () => ({
            data: {
              success: true,
              data: baseDetail,
            },
          }),
          replaceDocumento: async () => ({
            data: {
              success: true,
              data: {},
            },
          }),
          buildPreviewDocumentoUrl: () => '',
        },
      },
    },
  });

  await assert.rejects(
    () => hook.result.replaceDocument({
      operacionId: 10,
      documentoId: 5,
      file: null,
    }),
    /Seleccione un archivo PDF o imagen para reemplazar\./,
  );

  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.error, 'Seleccione un archivo PDF o imagen para reemplazar.');
});
