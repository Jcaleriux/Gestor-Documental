const REPORT_COLUMNS = [
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

const TEXT_COLUMNS = new Set([
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

const toReportRow = ({ documento, tipo, estadoByClave }) => {
  const resumen = getResumen(documento);
  const emisor = getEmisor(documento);
  const clave = String(documento?.clave || '').trim();
  const moneda = getMoneda(resumen);
  const tipoCambio = getTipoCambio(resumen, moneda);

  const totalComprobante = toNumber(
    pickPath(documento, [['total_factura'], ['monto']], null)
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
  const numeroDocumento = documento?.consecutivo || documento?.numero_consecutivo || clave || '-';
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

const getCellStyle = (column) => (
  TEXT_COLUMNS.has(column)
    ? ' style="mso-number-format:\'\\@\';"'
    : ''
);

const toExcelHtml = (rows) => {
  const headers = REPORT_COLUMNS.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const bodyRows = rows
    .map((row) => (
      `<tr>${REPORT_COLUMNS.map((column) => (
        `<td${getCellStyle(column)}>${toCellString(row[column])}</td>`
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

export const buildFacturasReportRows = ({
  facturas = [],
  notasCredito = [],
  mensajesHacienda = []
}) => {
  const estadoByClave = getEstadoHaciendaMap(mensajesHacienda);

  return [
    ...facturas.map((documento) => toReportRow({ documento, tipo: 'Factura', estadoByClave })),
    ...notasCredito.map((documento) => toReportRow({ documento, tipo: 'Nota de credito', estadoByClave }))
  ]
    .sort((a, b) => b.sortTime - a.sortTime)
    .map((item) => item.row);
};

export const downloadFacturasReportExcel = ({
  rows,
  sociedadId
}) => {
  const html = toExcelHtml(Array.isArray(rows) ? rows : []);
  const blob = new Blob(
    [`\uFEFF${html}`],
    { type: 'application/vnd.ms-excel;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSociedadId = String(sociedadId || 'sin_sociedad').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `reporte_facturas_notas_${safeSociedadId}_${dateStamp}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export { REPORT_COLUMNS };
