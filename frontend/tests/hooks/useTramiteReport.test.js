import test from 'node:test';
import assert from 'node:assert/strict';
import { useTramiteReport } from '../../src/hooks/tramiteDetalle/useTramiteReport.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useTramiteReportHarness = (props) => useTramiteReport(props);

test('useTramiteReport descarga el reporte del tramite con los documentos activos', async () => {
  const buildReportRows = createMockFn(() => ([
    { factura: '001' },
    { factura: '002' }
  ]));
  const downloadReport = createMockFn();

  const hook = createHookHarness({
    hook: useTramiteReportHarness,
    initialProps: {
      tramite: { id: 4 },
      documentos: [{ factura_id: 1 }, { factura_id: 2 }],
      providerGroups: [],
      sociedadId: 10,
      sociedadLabel: 'BSP',
      dependencies: {
        buildReportRows,
        downloadReport
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 4 });

  assert.equal(buildReportRows.calls.length, 1);
  assert.deepEqual(buildReportRows.calls[0][0], {
    tramite: { id: 4 },
    documentos: [{ factura_id: 1 }, { factura_id: 2 }],
    providerGroups: [],
    direction: 'asc'
  });
  assert.equal(downloadReport.calls.length, 1);
  assert.deepEqual(downloadReport.calls[0][0], {
    rows: [{ factura: '001' }, { factura: '002' }],
    sociedadId: 10,
    sociedadLabel: 'BSP',
    tramiteId: 4
  });
  assert.equal(hook.result.reportError, '');
  assert.equal(hook.result.reportMessage, 'Reporte generado con 2 documentos del tramite.');
});

test('useTramiteReport no descarga archivo cuando el tramite no tiene documentos activos', async () => {
  const downloadReport = createMockFn();

  const hook = createHookHarness({
    hook: useTramiteReportHarness,
    initialProps: {
      tramite: { id: 4 },
      documentos: [],
      providerGroups: [],
      sociedadId: 10,
      sociedadLabel: 'BSP',
      dependencies: {
        buildReportRows: createMockFn(() => []),
        downloadReport
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 4 });

  assert.equal(downloadReport.calls.length, 0);
  assert.equal(
    hook.result.reportError,
    'No hay documentos activos en el tramite para generar el reporte.'
  );
});
