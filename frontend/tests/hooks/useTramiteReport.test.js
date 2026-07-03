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

test('useTramiteReport descarga el PDF unificado con el orden visible actual', async () => {
  const buildUnifiedPdfUrl = createMockFn(() => '/api/tramites-pago/4/pdf-unificado?providerSortDirection=desc');
  const downloadProtectedFile = createMockFn(async () => ({
    response: {
      headers: {
        get(name) {
          if (name === 'X-SendaDocs-Partial-Download') return '0';
          return '';
        }
      }
    }
  }));

  const hook = createHookHarness({
    hook: useTramiteReportHarness,
    initialProps: {
      tramite: { id: 4 },
      documentos: [{ factura_id: 1 }],
      providerGroups: [],
      providerSortDirection: 'desc',
      dependencies: {
        buildUnifiedPdfUrl,
        downloadProtectedFile
      }
    }
  });

  await hook.result.downloadUnifiedPdf();
  await hook.flush({ cycles: 4 });

  assert.equal(buildUnifiedPdfUrl.calls.length, 1);
  assert.deepEqual(buildUnifiedPdfUrl.calls[0][0], 4);
  assert.deepEqual(buildUnifiedPdfUrl.calls[0][1], { providerSortDirection: 'desc' });
  assert.equal(downloadProtectedFile.calls.length, 1);
  assert.deepEqual(downloadProtectedFile.calls[0][0], '/api/tramites-pago/4/pdf-unificado?providerSortDirection=desc');
  assert.deepEqual(downloadProtectedFile.calls[0][1], {
    fallbackFilename: 'tramite_4_vista_unificada.pdf'
  });
  assert.equal(hook.result.downloadUnifiedPdfError, '');
  assert.equal(hook.result.downloadUnifiedPdfWarning, '');
  assert.equal(hook.result.downloadUnifiedPdfMessage, 'PDF unificado descargado correctamente.');
});

test('useTramiteReport muestra advertencia cuando la descarga unificada es parcial', async () => {
  const hook = createHookHarness({
    hook: useTramiteReportHarness,
    initialProps: {
      tramite: { id: 4 },
      documentos: [{ factura_id: 1 }],
      providerGroups: [],
      dependencies: {
        buildUnifiedPdfUrl: createMockFn(() => '/api/tramites-pago/4/pdf-unificado'),
        downloadProtectedFile: createMockFn(async () => ({
          response: {
            headers: {
              get(name) {
                if (name === 'X-SendaDocs-Partial-Download') return '1';
                if (name === 'X-SendaDocs-Omitted-Count') return '2';
                if (name === 'X-SendaDocs-Omitted-Items') return 'Factura F-001 - Tabla de pagos';
                return '';
              }
            }
          }
        }))
      }
    }
  });

  await hook.result.downloadUnifiedPdf();
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.downloadUnifiedPdfMessage, '');
  assert.equal(
    hook.result.downloadUnifiedPdfWarning,
    'Se descargo el PDF unificado con 2 archivos omitidos. Factura F-001 - Tabla de pagos'
  );
});

test('useTramiteReport muestra error cuando falla la descarga del PDF unificado', async () => {
  const hook = createHookHarness({
    hook: useTramiteReportHarness,
    initialProps: {
      tramite: { id: 4 },
      documentos: [{ factura_id: 1 }],
      providerGroups: [],
      dependencies: {
        buildUnifiedPdfUrl: createMockFn(() => '/api/tramites-pago/4/pdf-unificado'),
        downloadProtectedFile: createMockFn(async () => {
          throw new Error('Fallo de red');
        })
      }
    }
  });

  await hook.result.downloadUnifiedPdf();
  await hook.flush({ cycles: 4 });

  assert.equal(hook.result.downloadUnifiedPdfMessage, '');
  assert.equal(hook.result.downloadUnifiedPdfWarning, '');
  assert.equal(hook.result.downloadUnifiedPdfError, 'Fallo de red');
});
