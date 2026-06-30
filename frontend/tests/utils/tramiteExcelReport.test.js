import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTramiteReportRows,
  downloadTramiteReportExcel,
  TRAMITE_REPORT_COLUMNS
} from '../../src/utils/tramiteExcelReport.js';
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
    createObjectURL: createMockFn(() => 'blob:tramite-report'),
    revokeObjectURL: createMockFn()
  };
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate('2026-03-22T00:00:00.000Z');
      }
      return new RealDate(...args);
    }

    static now() {
      return new RealDate('2026-03-22T00:00:00.000Z').getTime();
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

test('buildTramiteReportRows arma el reporte del tramite con columnas de factura y contabilizacion en el orden esperado', () => {
  const rows = buildTramiteReportRows({
    documentos: [
      {
        factura_id: 45,
        consecutivo: '00100001010000000589',
        emisor: { Nombre: 'MANSOCUR S.A.' },
        resumen: {
          CodigoTipoMoneda: {
            CodigoMoneda: 'CRC'
          }
        },
        total_a_pagar: 57065,
        conta_fecha_vencimiento: '2026-03-31',
        conta_retencion: 1500,
        conta_descuento: 200,
        conta_anticipo_aplicado: 300,
        conta_monto_nota_credito: 400,
        conta_centro_costo: '1100000 - Costos de Obra',
        conta_cuenta_contable: 'AS-101',
        conta_orden_compra: 'OC-555',
        conta_notas: 'Pago parcial autorizado'
      }
    ]
  });

  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]), TRAMITE_REPORT_COLUMNS);
  assert.deepEqual(rows[0], {
    'Proveedor (este es el emisor)': 'MANSOCUR S.A.',
    'No. Factura (ultimos 11 numeros del consecutivo)': '10000000589',
    Moneda: 'CRC',
    'Monto a pagar': 57065,
    'Fecha de vencimiento': '31/03/2026',
    Retencion: 1500,
    Descuento: 200,
    'Anticipo aplicado': 300,
    'Monto nota de credito': 400,
    'Centro de costo': '1100000 - Costos de Obra',
    Asiento: 'AS-101',
    'Orden de compra': 'OC-555',
    'Observaciones contables': 'Pago parcial autorizado'
  });
});

test('buildTramiteReportRows usa fallbacks legibles cuando faltan datos contables', () => {
  const rows = buildTramiteReportRows({
    documentos: [
      {
        factura_id: 88,
        clave: '50622032600310188796100100001010000012345100000001',
        proveedor_nombre: 'Proveedor fallback',
        total_factura: 1250.5
      }
    ]
  });

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    'Proveedor (este es el emisor)': 'Proveedor fallback',
    'No. Factura (ultimos 11 numeros del consecutivo)': '01000001234',
    Moneda: 'CRC',
    'Monto a pagar': 1250.5,
    'Fecha de vencimiento': '-',
    Retencion: 0,
    Descuento: 0,
    'Anticipo aplicado': 0,
    'Monto nota de credito': 0,
    'Centro de costo': '-',
    Asiento: '-',
    'Orden de compra': '-',
    'Observaciones contables': '-'
  });
});

test('buildTramiteReportRows cubre claves cortas, factura fallback y fechas no ISO', () => {
  const rows = buildTramiteReportRows({
    documentos: [
      {
        factura_id: 'FAC-900',
        total_factura: 'monto invalido',
        conta_fecha_vencimiento: 'fecha invalida',
        conta_retencion_total: '12.345',
        conta_descuento: 'descuento invalido',
        conta_anticipo_aplicado: null,
        conta_monto_nota_credito: undefined,
        conta_centro_costo: '',
        conta_cuenta_contable: 4050,
        conta_orden_compra: 9988,
        conta_notas: 0
      },
      {
        factura_id: 12,
        clave: 'ABC-123-XYZ',
        emisor: { nombre: 'Proveedor con fecha' },
        monto_total: 150,
        conta_fecha_vencimiento: '2026-04-01T12:00:00.000Z'
      }
    ]
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0]['Proveedor (este es el emisor)'], '-');
  assert.equal(rows[0]['No. Factura (ultimos 11 numeros del consecutivo)'], '900');
  assert.equal(rows[0]['Monto a pagar'], 0);
  assert.equal(rows[0]['Fecha de vencimiento'], '-');
  assert.equal(rows[0].Retencion, 12.35);
  assert.equal(rows[0].Descuento, 0);
  assert.equal(rows[0].Asiento, '4050');
  assert.equal(rows[0]['Orden de compra'], '9988');
  assert.equal(rows[0]['Observaciones contables'], '0');
  assert.equal(rows[1]['No. Factura (ultimos 11 numeros del consecutivo)'], '123');
  assert.match(rows[1]['Fecha de vencimiento'], /1\/4\/2026|01\/04\/2026/);
});

test('downloadTramiteReportExcel genera HTML escapado y nombre seguro', async () => {
  const dom = installDownloadDom();
  try {
    downloadTramiteReportExcel({
      tramiteId: 'TR-1 / QA',
      sociedadId: '18 / norte',
      sociedadLabel: 'Proyecto Norte & Sur',
      rows: [{
        'Proveedor (este es el emisor)': 'Proveedor "QA" <R&D> O\'Connor',
        'No. Factura (ultimos 11 numeros del consecutivo)': '001',
        Moneda: 'CRC',
        'Monto a pagar': 100
      }]
    });

    assert.equal(dom.link.href, 'blob:tramite-report');
    assert.equal(
      dom.link.download,
      'reporte_tramite_pago_TR-1___QA_Proyecto_Norte___Sur_2026-03-22.xls'
    );
    assert.equal(dom.link.click.calls.length, 1);
    assert.equal(document.body.appendChild.calls[0][0], dom.link);
    assert.equal(document.body.removeChild.calls[0][0], dom.link);
    assert.deepEqual(URL.revokeObjectURL.calls[0], ['blob:tramite-report']);

    const blob = URL.createObjectURL.calls[0][0];
    const html = await blob.text();
    assert.match(html, /Proveedor &quot;QA&quot; &lt;R&amp;D&gt; O&#39;Connor/);
    assert.match(html, /mso-number-format:'\\@';/);
    assert.match(html, /<td><\/td>/);
  } finally {
    dom.restore();
  }
});

test('downloadTramiteReportExcel usa defaults cuando faltan filas e identificadores', async () => {
  const dom = installDownloadDom();
  try {
    downloadTramiteReportExcel({ rows: null });

    assert.equal(
      dom.link.download,
      'reporte_tramite_pago_sin_tramite_sin_sociedad_2026-03-22.xls'
    );

    const blob = URL.createObjectURL.calls[0][0];
    const html = await blob.text();
    assert.match(html, /<tbody><\/tbody>/);
  } finally {
    dom.restore();
  }
});
