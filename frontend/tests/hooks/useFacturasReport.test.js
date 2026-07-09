import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturasReport } from '../../src/hooks/facturas/useFacturasReport.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useFacturasReportHarness = (props) => useFacturasReport(props);

test('useFacturasReport recupera todas las paginas filtradas antes de descargar el reporte', async () => {
  const listFacturas = createMockFn(async (params) => ({
    data: {
      success: true,
      data: params.page === 1
        ? {
          items: [{ id: 1, ruta_xml: '/tmp/f1.xml', ruta_pdf: '/tmp/f1.pdf' }],
          meta: { hasNext: true }
        }
        : {
          items: [{ id: 2, ruta_xml: '/tmp/f2.xml', ruta_pdf: '/tmp/f2.pdf' }],
          meta: { hasNext: false }
        }
    }
  }));
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
  const getFacturaManifest = createMockFn(async () => ({ data: { received_time: '2026-03-01T10:00:00Z' } }));
  const getNotaCreditoManifest = createMockFn(async () => ({ data: { received_time: '2026-03-01T11:00:00Z' } }));

  const buildReportRows = createMockFn(({ facturas, notasCredito }) => ([
    { id: facturas.length, tipo: 'factura' },
    { id: notasCredito.length, tipo: 'nota_credito' }
  ]));
  const downloadReport = createMockFn();

  const hook = createHookHarness({
    hook: useFacturasReportHarness,
    initialProps: {
      sociedadId: 10,
      query: {
        page: 3,
        pageSize: 50,
        search: 'Proveedor'
      },
      filterNotaCreditoForReport: () => true,
      dependencies: {
        api: {
          listFacturas,
          listNotasCredito,
          listMensajesHacienda,
          getFacturaManifest,
          getNotaCreditoManifest
        },
        buildReportRows,
        downloadReport
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 8 });

  assert.equal(listFacturas.calls.length, 2);
  assert.equal(listNotasCredito.calls.length, 1);
  assert.equal(listMensajesHacienda.calls.length, 1);
  assert.equal(buildReportRows.calls.length, 1);
  assert.equal(downloadReport.calls.length, 1);
  assert.equal(buildReportRows.calls[0][0].facturas.length, 2);
  assert.equal(hook.result.reportError, '');
  assert.equal(hook.result.reportMessage, 'Reporte generado con 2 registros filtrados.');
});

test('useFacturasReport no descarga archivo cuando no hay filas', async () => {
  const listAllFacturas = createMockFn(async () => ([]));
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
    hook: useFacturasReportHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      filterNotaCreditoForReport: () => true,
      dependencies: {
        api: {
          listAllFacturas,
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

test('useFacturasReport falla con un mensaje claro si el backend devuelve el contrato legacy', async () => {
  const listFacturas = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 1 }]
    }
  }));

  const hook = createHookHarness({
    hook: useFacturasReportHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50, search: 'Proveedor' },
      filterNotaCreditoForReport: () => true,
      dependencies: {
        api: {
          listFacturas,
          listNotasCredito: createMockFn(async () => ({ data: { success: true, data: [] } })),
          listMensajesHacienda: createMockFn(async () => ({ data: { success: true, data: [] } })),
        },
        buildReportRows: createMockFn(() => []),
        downloadReport: createMockFn()
      }
    }
  });

  await hook.result.exportReport();
  await hook.flush({ cycles: 6 });

  assert.equal(
    hook.result.reportError,
    'El backend de facturas devolvio un formato no compatible. Reinicia o actualiza la API para usar el listado paginado.'
  );
});

test('useFacturasReport permite exportar el reporte simple con su generador dedicado', async () => {
  const listAllFacturas = createMockFn(async () => ([{ id: 1, ruta_xml: '/tmp/f1.xml' }]));
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
  const getFacturaManifest = createMockFn(async () => ({ data: { received_time: '2026-03-01T10:00:00Z' } }));
  const buildReportRows = createMockFn(() => [{ tipo: 'completo' }]);
  const buildSimpleReportRows = createMockFn(() => [{ tipo: 'simple' }]);
  const downloadReport = createMockFn();
  const downloadSimpleReport = createMockFn();

  const hook = createHookHarness({
    hook: useFacturasReportHarness,
    initialProps: {
      sociedadId: 10,
      query: { page: 1, pageSize: 50 },
      filterNotaCreditoForReport: () => true,
      dependencies: {
        api: {
          listAllFacturas,
          listNotasCredito,
          listMensajesHacienda,
          getFacturaManifest
        },
        buildReportRows,
        buildSimpleReportRows,
        downloadReport,
        downloadSimpleReport
      }
    }
  });

  await hook.result.exportReport('simple');
  await hook.flush({ cycles: 6 });

  assert.equal(buildReportRows.calls.length, 0);
  assert.equal(buildSimpleReportRows.calls.length, 1);
  assert.equal(downloadReport.calls.length, 0);
  assert.equal(downloadSimpleReport.calls.length, 1);
  assert.equal(hook.result.reportMessage, 'Reporte generado con 1 registros filtrados.');
});
