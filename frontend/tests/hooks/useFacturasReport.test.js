import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturasReport } from '../../src/hooks/facturas/useFacturasReport.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

test('useFacturasReport usa dependencias inyectadas para construir y descargar reporte', async () => {
  const listNotasCredito = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 'NC-1', emisor: { nombre: 'Proveedor 1' } }]
    }
  }));
  const listMensajesHacienda = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 'MH-1' }]
    }
  }));

  const buildReportRows = createMockFn(() => ([
    { id: 1, tipo: 'factura' },
    { id: 2, tipo: 'nota_credito' }
  ]));
  const downloadReport = createMockFn();

  const hook = createHookHarness({
    hook: (props) => useFacturasReport(props),
    initialProps: {
      sociedadId: 10,
      filtradas: [{ id: 1 }],
      filterNotaCreditoForReport: () => true,
      dependencies: {
        api: {
          listNotasCredito,
          listMensajesHacienda
        },
        buildReportRows,
        downloadReport
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 6 });

  assert.equal(listNotasCredito.calls.length, 1);
  assert.equal(listMensajesHacienda.calls.length, 1);
  assert.equal(buildReportRows.calls.length, 1);
  assert.equal(downloadReport.calls.length, 1);
  assert.equal(hook.result.reportError, '');
  assert.equal(hook.result.reportMessage, 'Reporte generado con 2 registros filtrados.');
});

test('useFacturasReport no descarga archivo cuando no hay filas', async () => {
  const listNotasCredito = createMockFn(async () => ({
    data: {
      success: true,
      data: []
    }
  }));
  const listMensajesHacienda = createMockFn(async () => ({
    data: {
      success: true,
      data: []
    }
  }));

  const buildReportRows = createMockFn(() => []);
  const downloadReport = createMockFn();

  const hook = createHookHarness({
    hook: (props) => useFacturasReport(props),
    initialProps: {
      sociedadId: 10,
      filtradas: [],
      filterNotaCreditoForReport: () => true,
      dependencies: {
        api: {
          listNotasCredito,
          listMensajesHacienda
        },
        buildReportRows,
        downloadReport
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 6 });

  assert.equal(downloadReport.calls.length, 0);
  assert.equal(
    hook.result.reportError,
    'No hay facturas ni notas de credito para generar el reporte.'
  );
});
