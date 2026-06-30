import test from 'node:test';
import assert from 'node:assert/strict';
import { usePdfsPendientes } from '../../src/hooks/facturas/usePdfsPendientes.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const usePdfsPendientesHarness = (props) => usePdfsPendientes(props);

test('usePdfsPendientes carga PDFs pendientes y selecciona el primero', async () => {
  const listPdfsPendientes = createMockFn(async () => ({
    data: {
      data: {
        items: [
          {
            ingestion_id: 'lote-1',
            ruta: 'pendientes/factura_abc-123.pdf',
            originalName: 'Factura_ABC-123.pdf'
          },
          {
            ingestion_id: 'lote-2',
            ruta: 'pendientes/factura_zzz.pdf',
            originalName: 'Factura_ZZZ.pdf'
          }
        ],
        summary: {
          totalPdfs: 2,
          totalLotes: 2
        }
      }
    }
  }));

  const hook = createHookHarness({
    hook: usePdfsPendientesHarness,
    initialProps: {
      sociedadId: 18,
      dependencies: {
        api: { listPdfsPendientes }
      }
    }
  });

  await hook.flush({ cycles: 6 });

  assert.deepEqual(listPdfsPendientes.calls[0], [{ sociedadId: 18 }]);
  assert.equal(hook.result.items.length, 2);
  assert.equal(hook.result.summary.totalPdfs, 2);
  assert.equal(hook.result.summary.totalLotes, 2);
  assert.equal(hook.result.selectedKey, 'lote-1:pendientes/factura_abc-123.pdf');
  assert.equal(hook.result.selectedPdf?.ingestion_id, 'lote-1');
  assert.equal(hook.result.candidateQuery, 'Factura ABC 123');
  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.actionError, '');
});

test('usePdfsPendientes busca candidatos, asocia el PDF y refresca el listado', async () => {
  let assigned = false;
  const pendingPdf = {
    ingestion_id: 'lote-1',
    ruta: 'pendientes/factura_abc-123.pdf',
    originalName: 'Factura_ABC-123.pdf'
  };
  const listPdfsPendientes = createMockFn(async () => ({
    data: {
      data: {
        items: assigned ? [] : [pendingPdf],
        summary: {
          totalPdfs: assigned ? 0 : 1,
          totalLotes: assigned ? 0 : 1
        }
      }
    }
  }));
  const searchPdfsPendientesFacturas = createMockFn(async () => ({
    data: {
      data: [
        { id: 99, numero_consecutivo: '001', has_pdf: false }
      ]
    }
  }));
  const assignPdfPendiente = createMockFn(async () => {
    assigned = true;
    return { data: { success: true } };
  });

  const hook = createHookHarness({
    hook: usePdfsPendientesHarness,
    initialProps: {
      sociedadId: 18,
      dependencies: {
        api: {
          listPdfsPendientes,
          searchPdfsPendientesFacturas,
          assignPdfPendiente
        }
      }
    }
  });

  await hook.flush({ cycles: 6 });
  await hook.result.searchCandidates('Factura ABC');
  await hook.flush({ cycles: 4 });

  assert.deepEqual(searchPdfsPendientesFacturas.calls[0], [{
    sociedad_id: 18,
    q: 'Factura ABC',
    limit: 20
  }]);
  assert.equal(hook.result.candidates.length, 1);
  assert.equal(hook.result.candidateSearchAttempted, true);
  assert.equal(hook.result.selectedFacturaId, '99');

  await hook.result.assignSelectedPdf();
  await hook.flush({ cycles: 6 });

  assert.deepEqual(assignPdfPendiente.calls[0], [{
    ingestion_id: 'lote-1',
    pdf_ruta: 'pendientes/factura_abc-123.pdf',
    factura_id: 99,
    sociedad_id: 18,
    overwrite: false
  }]);
  assert.equal(listPdfsPendientes.calls.length, 2);
  assert.equal(hook.result.message, 'PDF asociado correctamente.');
  assert.deepEqual(hook.result.items, []);
  assert.equal(hook.result.selectedKey, '');
  assert.equal(hook.result.candidates.length, 0);
  assert.equal(hook.result.candidateSearchAttempted, false);
});
