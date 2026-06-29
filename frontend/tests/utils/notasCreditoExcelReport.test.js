import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotasCreditoReportRows,
  downloadNotasCreditoReportExcel,
  REPORT_COLUMNS
} from '../../src/utils/notasCreditoExcelReport.js';
import { createMockFn } from '../utils/mockFn.js';

const installDownloadDom = () => {
  const previousDocument = globalThis.document;
  const previousURL = globalThis.URL;
  const RealDate = globalThis.Date;
  const link = {
    href: '',
    download: '',
    click: createMockFn()
  };

  globalThis.document = {
    createElement: createMockFn(() => link),
    body: {
      appendChild: createMockFn(),
      removeChild: createMockFn()
    }
  };
  globalThis.URL = {
    createObjectURL: createMockFn(() => 'blob:notas-report'),
    revokeObjectURL: createMockFn()
  };
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate('2026-03-21T00:00:00.000Z');
      }
      return new RealDate(...args);
    }

    static now() {
      return new RealDate('2026-03-21T00:00:00.000Z').getTime();
    }

    static parse(value) {
      return RealDate.parse(value);
    }

    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  };

  return {
    link,
    restore() {
      globalThis.document = previousDocument;
      globalThis.URL = previousURL;
      globalThis.Date = RealDate;
    }
  };
};

test('buildNotasCreditoReportRows ordena y normaliza saldos, moneda y disponibilidad', () => {
  const rows = buildNotasCreditoReportRows({
    notasCredito: [
      {
        id: 1,
        numero_consecutivo: 'NC-1',
        fecha_emision: '2026-03-10T10:00:00.000Z',
        emisor: { Nombre: 'Proveedor Uno' },
        resumen: { CodigoTipoMoneda: { CodigoMoneda: 'usd' } },
        monto_total: '100.236',
        total_aplicado: '25.1',
        saldo_disponible: '75.136',
        estado: 'aplicada',
        ruta_pdf: 'docs/nota.pdf',
        ruta_xml: ''
      },
      {
        id: 2,
        fecha_emision: '2026-03-11T10:00:00.000Z',
        emisor: { nombre: 'Proveedor Dos' },
        resumen: {},
        monto: 50,
        total_aplicado: null,
        saldo_disponible: 50,
        estado: 'disponible',
        ruta_xml: 'docs/nota.xml'
      }
    ]
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), REPORT_COLUMNS);
  assert.equal(rows[0].Documento, 'Nota de credito #2');
  assert.equal(rows[0].Emisor, 'Proveedor Dos');
  assert.equal(rows[0].Moneda, 'CRC');
  assert.equal(rows[0].Estado, 'Disponible');
  assert.equal(rows[0]['PDF Disponible'], 'No');
  assert.equal(rows[0]['XML Disponible'], 'Si');
  assert.equal(rows[1].Moneda, 'USD');
  assert.equal(rows[1]['Monto Total'], 100.24);
  assert.equal(rows[1]['Total Aplicado'], 25.1);
  assert.equal(rows[1]['Saldo Disponible'], 75.14);
  assert.equal(rows[1].Estado, 'Aplicada');
  assert.equal(rows[1]['PDF Disponible'], 'Si');
});

test('downloadNotasCreditoReportExcel genera HTML escapado y nombre seguro', async () => {
  const dom = installDownloadDom();
  try {
    downloadNotasCreditoReportExcel({
      sociedadId: '18 / norte',
      rows: [{
        ...Object.fromEntries(REPORT_COLUMNS.map((column) => [column, ''])),
        Documento: 'NC-1',
        Emisor: 'Proveedor <NC> & Asociados',
        Moneda: 'CRC',
        'Monto Total': 100
      }]
    });

    assert.equal(dom.link.href, 'blob:notas-report');
    assert.equal(dom.link.download, 'reporte_notas_credito_18___norte_2026-03-21.xls');
    assert.equal(dom.link.click.calls.length, 1);
    assert.equal(document.body.appendChild.calls[0][0], dom.link);
    assert.equal(document.body.removeChild.calls[0][0], dom.link);
    assert.deepEqual(URL.revokeObjectURL.calls[0], ['blob:notas-report']);

    const blob = URL.createObjectURL.calls[0][0];
    const html = await blob.text();
    assert.match(html, /Proveedor &lt;NC&gt; &amp; Asociados/);
    assert.match(html, /mso-number-format:'\\@';/);
  } finally {
    dom.restore();
  }
});
