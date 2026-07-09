import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  buildFacturasReportRows,
  buildFacturasSimpleReportRows,
  downloadFacturasReportExcel,
  downloadFacturasSimpleReportExcel,
  REPORT_COLUMNS
} from '../../src/utils/facturasExcelReport.js';
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
    createObjectURL: createMockFn(() => 'blob:facturas-report'),
    revokeObjectURL: createMockFn()
  };
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate('2026-03-20T00:00:00.000Z');
      }
      return new RealDate(...args);
    }

    static now() {
      return new RealDate('2026-03-20T00:00:00.000Z').getTime();
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

test('buildFacturasReportRows combina facturas y notas, ordena por fecha y calcula moneda', () => {
  const rows = buildFacturasReportRows({
    facturas: [
      {
        clave: 'clave-factura',
        consecutivo: '00100001010000012345',
        fecha_emision: '2026-03-10T12:00:00.000Z',
        manifest_received_time: '2026-03-11T08:00:00.000Z',
        emisor: {
          Nombre: 'Proveedor & Asociados',
          Identificacion: { Numero: '3101123456' }
        },
        resumen: {
          CodigoTipoMoneda: {
            CodigoMoneda: 'USD',
            TipoCambio: 500
          },
          TotalComprobante: '100',
          TotalImpuesto: '13',
          TotalDescuentos: '5',
          TotalGravado: '80',
          TotalExento: '20',
          TotalVenta: '105',
          TotalVentaNeta: '100'
        },
        xml_completo: {
          CondicionVenta: '01',
          MedioPago: ['01', '02']
        },
        estado: 'procesado'
      }
    ],
    notasCredito: [
      {
        clave: 'clave-nota',
        numero_consecutivo: 'NC-1',
        fecha_emision: '2026-03-12T09:00:00.000Z',
        emisor: { nombre: 'Nota Proveedor' },
        resumen: {
          CodigoMoneda: 'CRC',
          TotalComprobante: 2500
        }
      }
    ],
    mensajesHacienda: [
      { clave: 'clave-factura', estado: 'rechazado', creado_en: '2026-03-10T12:01:00.000Z' },
      { clave: 'clave-factura', estado: 'aceptado', creado_en: '2026-03-10T12:05:00.000Z' }
    ]
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), REPORT_COLUMNS);
  assert.equal(rows[0].Tipo, 'Nota de credito');
  assert.equal(rows[1].Tipo, 'Factura');
  assert.equal(rows[1].Numero, '00100001010000012345');
  assert.equal(rows[1].Proveedor, 'Proveedor & Asociados');
  assert.equal(rows[1].Moneda, 'USD');
  assert.equal(rows[1]['Tipo Cambio'], 500);
  assert.equal(rows[1]['Total Comprobante'], 100);
  assert.equal(rows[1]['Total Comprobante CRC'], 50000);
  assert.equal(rows[1]['Total Comprobante USD'], 100);
  assert.equal(rows[1]['% Total Impuesto'], 13);
  assert.equal(rows[1]['Estado Hacienda'], 'aceptado');
  assert.equal(rows[1]['Medio de Pago'], '01, 02');
});

test('downloadFacturasReportExcel genera HTML escapado y nombre seguro', async () => {
  const dom = installDownloadDom();
  try {
    downloadFacturasReportExcel({
      sociedadId: '18 / norte',
      rows: [{
        ...Object.fromEntries(REPORT_COLUMNS.map((column) => [column, ''])),
        Numero: '001',
        Proveedor: 'Proveedor <QA> & Asociados',
        Moneda: 'CRC',
        'Total Comprobante': 100
      }]
    });

    assert.equal(dom.link.href, 'blob:facturas-report');
    assert.equal(dom.link.download, 'reporte_facturas_notas_18___norte_2026-03-20.xls');
    assert.equal(dom.link.click.calls.length, 1);
    assert.equal(document.body.appendChild.calls[0][0], dom.link);
    assert.equal(document.body.removeChild.calls[0][0], dom.link);
    assert.deepEqual(URL.revokeObjectURL.calls[0], ['blob:facturas-report']);

    const blob = URL.createObjectURL.calls[0][0];
    const html = await blob.text();
    assert.match(html, /Proveedor &lt;QA&gt; &amp; Asociados/);
    assert.match(html, /mso-number-format:'\\@';/);
  } finally {
    dom.restore();
  }
});

test('buildFacturasSimpleReportRows replica las columnas del reporte simple y separa IVA por tarifa', () => {
  const rows = buildFacturasSimpleReportRows({
    facturas: [
      {
        consecutivo: '00100001010000012345',
        fecha_emision: '2026-03-10T12:00:00.000Z',
        emisor: {
          Nombre: 'Proveedor 1',
          Identificacion: { Numero: '3101123456' }
        },
        resumen: {
          TotalComprobante: '114.5',
          TotalDescuentos: '1.5'
        },
        xml_completo: {
          DetalleServicio: {
            LineaDetalle: [
              { Impuesto: { Tarifa: '13.00', Monto: '13' } },
              { Impuesto: { Tarifa: '1.00', Monto: '1' } }
            ]
          }
        }
      }
    ],
    notasCredito: [
      {
        numero_consecutivo: 'NC-100',
        fecha_emision: '2026-03-12T09:00:00.000Z',
        emisor: {
          nombre: 'Nota Proveedor',
          identificacion: { numero: '3101000001' }
        },
        resumen: {
          TotalComprobante: 5000,
          TotalDescuentos: 0
        }
      }
    ],
    mensajesHacienda: []
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(Object.keys(rows[0]), [
    'DOCUMENTO',
    'FECHA',
    'PROVEEDOR',
    'FACTURA',
    'IVA 13%',
    'IVA 1%',
    'DEVOLUCIONES / DESCUENTOS',
    'SUBTOTAL',
    'TOTAL A PAGAR',
    'CEDULA   JURIDICA'
  ]);
  assert.equal(rows[0].DOCUMENTO, 'Nota de credito');
  assert.equal(rows[1].DOCUMENTO, 'Factura');
  assert.equal(rows[1].FACTURA, '00100001010000012345');
  assert.equal(rows[1]['IVA 13%'], 13);
  assert.equal(rows[1]['IVA 1%'], 1);
  assert.equal(rows[1]['DEVOLUCIONES / DESCUENTOS'], 1.5);
  assert.equal(rows[1].SUBTOTAL, 99);
  assert.equal(rows[1]['TOTAL A PAGAR'], 114.5);
  assert.equal(rows[1]['CEDULA   JURIDICA'], '3101123456');
});

test('downloadFacturasSimpleReportExcel genera archivo con nombre y columnas simples', async () => {
  const dom = installDownloadDom();
  try {
    await downloadFacturasSimpleReportExcel({
      sociedadId: '18 / norte',
      rows: [{
        DOCUMENTO: 'Factura',
        FECHA: '10/3/2026',
        PROVEEDOR: 'Proveedor <QA> & Asociados',
        FACTURA: '001',
        'IVA 13%': 13,
        'IVA 1%': 0,
        'DEVOLUCIONES / DESCUENTOS': 0,
        SUBTOTAL: 100,
        'TOTAL A PAGAR': 113,
        'CEDULA   JURIDICA': '3101123456'
      }]
    });

    assert.equal(dom.link.download, 'reporte_facturas_simple_18___norte_2026-03-20.xlsx');
    const blob = URL.createObjectURL.calls[0][0];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const worksheet = workbook.getWorksheet('Reporte simple');
    const rows = worksheet.getSheetValues().slice(1).map((row) => (
      Array.isArray(row) ? row.slice(1) : row
    ));
    assert.deepEqual(rows[0], [
      'DOCUMENTO',
      'FECHA',
      'PROVEEDOR',
      'FACTURA',
      'IVA 13%',
      'IVA 1%',
      'DEVOLUCIONES / DESCUENTOS',
      'SUBTOTAL',
      'TOTAL A PAGAR',
      'CEDULA   JURIDICA'
    ]);
    assert.equal(rows[1][2], 'Proveedor <QA> & Asociados');
  } finally {
    dom.restore();
  }
});
