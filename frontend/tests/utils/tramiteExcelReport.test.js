import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTramiteReportRows,
  TRAMITE_REPORT_COLUMNS
} from '../../src/utils/tramiteExcelReport.js';

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
