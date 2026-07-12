const COMPLETE_REPORT_COLUMNS = [
  'Fecha Emision',
  'Fecha received_time',
  'Tipo',
  'Numero',
  'Identificacion Proveedor',
  'Proveedor',
  'Moneda',
  'Total Comprobante',
  'Tipo Cambio',
  'Total Impuesto',
  'Total Descuentos',
  'Total Gravado',
  'Total Exento',
  'Total Venta',
  'Total Servicios Exentos',
  'Total Servicios Gravados',
  'Total Mercancias Exentas',
  'Total Mercancias Gravadas',
  'Total Venta Neta',
  'Estado Hacienda',
  'Condicion de Venta',
  'Medio de Pago',
  'Total Comprobante CRC',
  'Total Comprobante USD',
  '% Total Impuesto'
];

const SIMPLE_REPORT_COLUMNS = [
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
];

const COMPLETE_REPORT_TEXT_COLUMNS = new Set([
  'Fecha Emision',
  'Fecha received_time',
  'Tipo',
  'Numero',
  'Identificacion Proveedor',
  'Proveedor',
  'Moneda',
  'Estado Hacienda',
  'Condicion de Venta',
  'Medio de Pago'
]);

const SIMPLE_REPORT_TEXT_COLUMNS = new Set([
  'DOCUMENTO',
  'FECHA',
  'PROVEEDOR',
  'FACTURA',
  'CEDULA   JURIDICA'
]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

const getPathValue = (source, pathParts) => {
  let current = source;
  for (const part of pathParts) {
    if (current == null) return null;
    current = current[part];
  }
  return current;
};

const pickPath = (source, paths, fallback = null) => {
  for (const pathParts of paths) {
    const value = getPathValue(source, pathParts);
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }
  return fallback;
};

const toDateString = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-CR');
};

const getSortTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const getResumen = (documento) => (
  documento?.resumen
  || documento?.xml_completo?.ResumenFactura
  || documento?.xml_completo?.ResumenNotaCredito
  || {}
);

const getEmisor = (documento) => (
  documento?.emisor
  || documento?.xml_completo?.Emisor
  || documento?.xml_completo?.emisor
  || {}
);

const getMoneda = (resumen) => String(
  pickPath(resumen, [
    ['CodigoTipoMoneda', 'CodigoMoneda'],
    ['codigoTipoMoneda', 'codigoMoneda'],
    ['CodigoMoneda'],
    ['codigoMoneda']
  ], 'CRC')
).toUpperCase();

const getTipoCambio = (resumen, moneda) => {
  const tipoCambio = toNumber(pickPath(resumen, [
    ['CodigoTipoMoneda', 'TipoCambio'],
    ['codigoTipoMoneda', 'tipoCambio'],
    ['TipoCambio'],
    ['tipoCambio']
  ], 0), 0);

  if (tipoCambio > 0) return tipoCambio;
  return moneda === 'CRC' ? 1 : 0;
};

const getEstadoHaciendaMap = (mensajesHacienda = []) => {
  const byClave = new Map();

  mensajesHacienda.forEach((mensaje) => {
    const clave = String(mensaje?.clave || '').trim();
    if (!clave) return;

    const creadoEn = getSortTime(mensaje?.creado_en);
    const estado = mensaje?.estado || '-';
    const previous = byClave.get(clave);
    if (!previous || creadoEn >= previous.creadoEn) {
      byClave.set(clave, { estado, creadoEn });
    }
  });

  return byClave;
};

const getMedioPago = (documento) => {
  const medioPagoRaw = pickPath(documento, [
    ['xml_completo', 'MedioPago'],
    ['xml_completo', 'medioPago']
  ], null);

  if (Array.isArray(medioPagoRaw)) {
    const valores = medioPagoRaw
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    return valores.length > 0 ? valores.join(', ') : '-';
  }

  if (medioPagoRaw == null || medioPagoRaw === '') {
    return '-';
  }

  return String(medioPagoRaw);
};

const getManifestReceivedTime = (documento) => pickPath(documento, [
  ['manifest_received_time'],
  ['received_time']
], null);

const getDocumentTypeLabel = (tipo) => (
  tipo === 'Nota de credito'
    ? 'Nota de credito'
    : 'Factura'
);

const getNumeroDocumento = (documento) => (
  documento?.consecutivo
  || documento?.numero_consecutivo
  || documento?.xml_completo?.NumeroConsecutivo
  || documento?.clave
  || '-'
);

const getDocumentTaxItems = (documento) => {
  const lineas = ensureArray(
    documento?.xml_completo?.DetalleServicio?.LineaDetalle
    || documento?.xml_completo?.detalleServicio?.lineaDetalle
  );

  const impuestosPorLinea = lineas.flatMap((linea) => ensureArray(linea?.Impuesto || linea?.impuesto));
  if (impuestosPorLinea.length > 0) {
    return impuestosPorLinea;
  }

  return ensureArray(
    documento?.resumen?.TotalDesgloseImpuesto
    || documento?.resumen?.totalDesgloseImpuesto
    || documento?.xml_completo?.ResumenFactura?.TotalDesgloseImpuesto
    || documento?.xml_completo?.ResumenNotaCredito?.TotalDesgloseImpuesto
  );
};

const resolveTaxRate = (impuesto) => {
  const tarifa = toNumber(
    impuesto?.Tarifa
    ?? impuesto?.tarifa
    ?? impuesto?.TarifaIVA
    ?? impuesto?.tarifaIVA,
    null
  );

  if (tarifa !== null) {
    return tarifa;
  }

  const codigoTarifa = String(
    impuesto?.CodigoTarifaIVA
    ?? impuesto?.codigoTarifaIVA
    ?? ''
  ).trim();

  if (codigoTarifa === '01') return 13;
  if (codigoTarifa === '02') return 1;

  return null;
};

const getTaxBreakdown = (documento) => {
  const taxes = getDocumentTaxItems(documento);
  return taxes.reduce((acc, impuesto) => {
    const rate = resolveTaxRate(impuesto);
    const amount = toNumber(
      impuesto?.Monto
      ?? impuesto?.monto
      ?? impuesto?.TotalMontoImpuesto
      ?? impuesto?.totalMontoImpuesto,
      0
    );

    if (!amount) {
      return acc;
    }

    if (rate === 13) {
      acc.iva13 += amount;
    } else if (rate === 1) {
      acc.iva1 += amount;
    }

    return acc;
  }, { iva13: 0, iva1: 0 });
};

const toCompleteReportRow = ({ documento, tipo, estadoByClave }) => {
  const resumen = getResumen(documento);
  const emisor = getEmisor(documento);
  const clave = String(documento?.clave || '').trim();
  const moneda = getMoneda(resumen);
  const tipoCambio = getTipoCambio(resumen, moneda);

  const totalComprobante = toNumber(
    pickPath(documento, [['total_factura'], ['monto'], ['monto_total']], null)
      ?? pickPath(resumen, [['TotalComprobante'], ['totalComprobante']], 0),
    0
  );
  const totalImpuesto = toNumber(pickPath(resumen, [['TotalImpuesto'], ['totalImpuesto']], 0), 0);
  const totalDescuentos = toNumber(pickPath(resumen, [['TotalDescuentos'], ['totalDescuentos']], 0), 0);
  const totalGravado = toNumber(pickPath(resumen, [['TotalGravado'], ['totalGravado']], 0), 0);
  const totalExento = toNumber(pickPath(resumen, [['TotalExento'], ['totalExento']], 0), 0);
  const totalVenta = toNumber(pickPath(resumen, [['TotalVenta'], ['totalVenta']], 0), 0);
  const totalServiciosExentos = toNumber(pickPath(resumen, [['TotalServExentos'], ['totalServExentos']], 0), 0);
  const totalServiciosGravados = toNumber(pickPath(resumen, [['TotalServGravados'], ['totalServGravados']], 0), 0);
  const totalMercanciasExentas = toNumber(
    pickPath(resumen, [['TotalMercanciasExentas'], ['totalMercanciasExentas']], 0),
    0
  );
  const totalMercanciasGravadas = toNumber(
    pickPath(resumen, [['TotalMercanciasGravadas'], ['totalMercanciasGravadas']], 0),
    0
  );
  const totalVentaNeta = toNumber(pickPath(resumen, [['TotalVentaNeta'], ['totalVentaNeta']], 0), 0);

  const totalComprobanteCRC = moneda === 'CRC'
    ? totalComprobante
    : (tipoCambio > 0 ? totalComprobante * tipoCambio : 0);
  const totalComprobanteUSD = moneda === 'USD'
    ? totalComprobante
    : (tipoCambio > 0 ? totalComprobante / tipoCambio : 0);

  const porcentajeImpuesto = totalComprobante !== 0
    ? (totalImpuesto / totalComprobante) * 100
    : 0;

  const estadoHaciendaInfo = clave ? estadoByClave.get(clave) : null;
  const numeroDocumento = getNumeroDocumento(documento);
  const manifestReceivedTime = getManifestReceivedTime(documento);

  return {
    sortTime: getSortTime(documento?.fecha_emision),
    row: {
      'Fecha Emision': toDateString(documento?.fecha_emision),
      'Fecha received_time': toDateString(manifestReceivedTime),
      Tipo: tipo,
      Numero: String(numeroDocumento),
      'Identificacion Proveedor': pickPath(emisor, [
        ['Identificacion', 'Numero'],
        ['identificacion', 'numero'],
        ['NumeroIdentificacion'],
        ['numeroIdentificacion']
      ], '-'),
      Proveedor: pickPath(emisor, [['Nombre'], ['nombre']], '-'),
      Moneda: moneda || 'CRC',
      'Total Comprobante': round(totalComprobante, 2),
      'Tipo Cambio': round(tipoCambio, 4),
      'Total Impuesto': round(totalImpuesto, 2),
      'Total Descuentos': round(totalDescuentos, 2),
      'Total Gravado': round(totalGravado, 2),
      'Total Exento': round(totalExento, 2),
      'Total Venta': round(totalVenta, 2),
      'Total Servicios Exentos': round(totalServiciosExentos, 2),
      'Total Servicios Gravados': round(totalServiciosGravados, 2),
      'Total Mercancias Exentas': round(totalMercanciasExentas, 2),
      'Total Mercancias Gravadas': round(totalMercanciasGravadas, 2),
      'Total Venta Neta': round(totalVentaNeta, 2),
      'Estado Hacienda': estadoHaciendaInfo?.estado || documento?.estado || '-',
      'Condicion de Venta': pickPath(documento, [['xml_completo', 'CondicionVenta'], ['xml_completo', 'condicionVenta']], '-'),
      'Medio de Pago': getMedioPago(documento),
      'Total Comprobante CRC': round(totalComprobanteCRC, 2),
      'Total Comprobante USD': round(totalComprobanteUSD, 2),
      '% Total Impuesto': round(porcentajeImpuesto, 2)
    }
  };
};

const toSimpleReportRow = ({ documento, tipo }) => {
  const resumen = getResumen(documento);
  const emisor = getEmisor(documento);
  const { iva13, iva1 } = getTaxBreakdown(documento);
  const totalComprobante = toNumber(
    pickPath(documento, [['total_factura'], ['monto'], ['monto_total']], null)
      ?? pickPath(resumen, [['TotalComprobante'], ['totalComprobante']], 0),
    0
  );
  const descuentos = toNumber(pickPath(resumen, [['TotalDescuentos'], ['totalDescuentos']], 0), 0);
  const subtotal = totalComprobante - iva13 - iva1 - descuentos;

  return {
    sortTime: getSortTime(documento?.fecha_emision),
    row: {
      DOCUMENTO: getDocumentTypeLabel(tipo),
      FECHA: toDateString(documento?.fecha_emision),
      PROVEEDOR: pickPath(emisor, [['Nombre'], ['nombre']], '-'),
      FACTURA: String(getNumeroDocumento(documento)),
      'IVA 13%': round(iva13, 2),
      'IVA 1%': round(iva1, 2),
      'DEVOLUCIONES / DESCUENTOS': round(descuentos, 2),
      SUBTOTAL: round(subtotal, 2),
      'TOTAL A PAGAR': round(totalComprobante, 2),
      'CEDULA   JURIDICA': pickPath(emisor, [
        ['Identificacion', 'Numero'],
        ['identificacion', 'numero'],
        ['NumeroIdentificacion'],
        ['numeroIdentificacion']
      ], '-')
    }
  };
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toCellString = (value) => {
  if (value === null || value === undefined) return '';
  return escapeHtml(value);
};

const getCellStyle = (column, textColumns) => (
  textColumns.has(column)
    ? ' style="mso-number-format:\'\\@\';"'
    : ''
);

const toExcelHtml = ({ rows, columns, textColumns }) => {
  const headers = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const bodyRows = rows
    .map((row) => (
      `<tr>${columns.map((column) => (
        `<td${getCellStyle(column, textColumns)}>${toCellString(row[column])}</td>`
      )).join('')}</tr>`
    ))
    .join('');

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <style>
    table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 12px; }
    th, td { border: 1px solid #cfd6df; padding: 4px 6px; white-space: nowrap; }
    th { background: #eef3f9; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
};

const buildSimpleWorkbookBlob = async ({ rows, columns }) => {
  const { default: ExcelJS } = await import('exceljs');
  const orderedRows = (Array.isArray(rows) ? rows : []).map((row) => (
    Object.fromEntries(columns.map((column) => [column, row?.[column] ?? '']))
  ));
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte simple');
  worksheet.columns = columns.map((column, index) => ({
    header: column,
    key: column,
    width: [14, 14, 42, 24, 12, 12, 28, 14, 16, 18][index] || 18
  }));
  orderedRows.forEach((row) => {
    worksheet.addRow(row);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();

  return new Blob(
    [arrayBuffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
};

const buildCombinedRows = ({
  facturas = [],
  notasCredito = [],
  mensajesHacienda = [],
  rowBuilder
}) => {
  const estadoByClave = getEstadoHaciendaMap(mensajesHacienda);

  return [
    ...facturas.map((documento) => rowBuilder({ documento, tipo: 'Factura', estadoByClave })),
    ...notasCredito.map((documento) => rowBuilder({ documento, tipo: 'Nota de credito', estadoByClave }))
  ]
    .sort((a, b) => b.sortTime - a.sortTime)
    .map((item) => item.row);
};

const downloadExcelReport = ({
  rows,
  sociedadId,
  columns,
  textColumns,
  filenamePrefix
}) => {
  const html = toExcelHtml({
    rows: Array.isArray(rows) ? rows : [],
    columns,
    textColumns
  });
  const blob = new Blob(
    [`\uFEFF${html}`],
    { type: 'application/vnd.ms-excel;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSociedadId = String(sociedadId || 'sin_sociedad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filenamePrefix}_${safeSociedadId}_${dateStamp}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildFacturasReportRows = ({
  facturas = [],
  notasCredito = [],
  mensajesHacienda = []
}) => buildCombinedRows({
  facturas,
  notasCredito,
  mensajesHacienda,
  rowBuilder: toCompleteReportRow
});

export const buildFacturasSimpleReportRows = ({
  facturas = [],
  notasCredito = [],
  mensajesHacienda = []
}) => buildCombinedRows({
  facturas,
  notasCredito,
  mensajesHacienda,
  rowBuilder: toSimpleReportRow
});

export const downloadFacturasReportExcel = ({
  rows,
  sociedadId
}) => downloadExcelReport({
  rows,
  sociedadId,
  columns: COMPLETE_REPORT_COLUMNS,
  textColumns: COMPLETE_REPORT_TEXT_COLUMNS,
  filenamePrefix: 'reporte_facturas_notas'
});

export const downloadFacturasSimpleReportExcel = ({
  rows,
  sociedadId
}) => (async () => {
  const blob = await buildSimpleWorkbookBlob({
    rows,
    columns: SIMPLE_REPORT_COLUMNS
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSociedadId = String(sociedadId || 'sin_sociedad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `reporte_facturas_simple_${safeSociedadId}_${dateStamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
})();

export {
  COMPLETE_REPORT_COLUMNS as REPORT_COLUMNS,
  SIMPLE_REPORT_COLUMNS
};
