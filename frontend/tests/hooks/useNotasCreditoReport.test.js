import test from 'node:test';
import assert from 'node:assert/strict';
import { useNotasCreditoReport } from '../../src/hooks/notasCredito/useNotasCreditoReport.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useNotasCreditoReportHarness = (props) => useNotasCreditoReport(props);

test('useNotasCreditoReport exporta todas las notas filtradas', async () => {
  const listAllNotasCredito = createMockFn(async () => ([
    { id: 1, estado: 'disponible' },
    { id: 2, estado: 'aplicada' }
  ]));
  const buildReportRows = createMockFn(({ notasCredito }) => notasCredito.map((nota) => ({ id: nota.id })));
  const downloadReport = createMockFn();

  const hook = createHookHarness({
    hook: useNotasCreditoReportHarness,
    initialProps: {
      sociedadId: 12,
      query: { estado: 'disponible', page: 2, pageSize: 50 },
      dependencies: {
        api: { listAllNotasCredito },
        buildReportRows,
        downloadReport
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 6 });

  assert.equal(listAllNotasCredito.calls.length, 1);
  assert.deepEqual(listAllNotasCredito.calls[0][0], {
    sociedadId: 12,
    estado: 'disponible',
    page: 2,
    pageSize: 50,
  });
  assert.equal(buildReportRows.calls.length, 1);
  assert.equal(downloadReport.calls.length, 1);
  assert.equal(hook.result.reportError, '');
  assert.equal(hook.result.reportMessage, 'Reporte generado con 2 notas de credito filtradas.');
});

test('useNotasCreditoReport muestra error si no hay filas para exportar', async () => {
  const hook = createHookHarness({
    hook: useNotasCreditoReportHarness,
    initialProps: {
      sociedadId: 12,
      query: { page: 1, pageSize: 50 },
      dependencies: {
        api: { listAllNotasCredito: createMockFn(async () => []) },
        buildReportRows: createMockFn(() => []),
        downloadReport: createMockFn()
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.reportError, 'No hay notas de credito para generar el reporte.');
});
