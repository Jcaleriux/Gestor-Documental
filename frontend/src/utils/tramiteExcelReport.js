import { getMoneda, getMontoDocumento } from './formatters.js';
import { sortDocumentosByProveedor } from './tramiteProviderOrdering.js';

export const TRAMITE_REPORT_COLUMNS = [
  'Proveedor (este es el emisor)',
  'No. Factura (ultimos 11 numeros del consecutivo)',
  'Moneda',
  'Monto a pagar',
  'Fecha de vencimiento',
  'Retencion',
  'Descuento',
  'Anticipo aplicado',
  'Monto nota de credito',
  'Centro de costo',
  'Asiento',
  'Orden de compra',
  'Observaciones contables'
];

const TEXT_COLUMNS = new Set([
  'Proveedor (este es el emisor)',
  'No. Factura (ultimos 11 numeros del consecutivo)',
  'Moneda',
  'Fecha de vencimiento',
  'Centro de costo',
  'Asiento',
  'Orden de compra',
  'Observaciones contables'
]);

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
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

const getProveedor = (documento) => (
  documento?.emisor?.Nombre
  || documento?.emisor?.nombre
  || documento?.proveedor_nombre
  || '-'
);

const getConsecutivoDigits = (documento) => {
  const consecutivo = String(documento?.consecutivo || '').trim();
  if (consecutivo) {
    return consecutivo.replace(/\D/g, '');
  }

  const clave = String(documento?.clave || '').trim().replace(/\D/g, '');
  if (clave.length >= 40) {
    return clave.slice(20, 40);
  }
  if (clave) {
    return clave;
  }

  return String(documento?.factura_id || '').replace(/\D/g, '');
};

const getLast11ConsecutivoDigits = (documento) => {
  const digits = getConsecutivoDigits(documento);
  if (!digits) return '-';
  return digits.slice(-11);
};

const toDateString = (value) => {
  if (!value) return '-';

  const raw = String(value).trim();
  if (DATE_ONLY_PATTERN.test(raw)) {
    const [year, month, day] = raw.split('-');
    return `${day}/${month}/${year}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-CR');
};

const toTextValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
};

const toReportRow = (documento) => ({
  'Proveedor (este es el emisor)': getProveedor(documento),
  'No. Factura (ultimos 11 numeros del consecutivo)': getLast11ConsecutivoDigits(documento),
  Moneda: getMoneda(documento),
  'Monto a pagar': round(getMontoDocumento(documento, { preferAjustado: true }), 2),
  'Fecha de vencimiento': toDateString(documento?.conta_fecha_vencimiento),
  Retencion: round(
    documento?.conta_retencion_total ?? documento?.conta_retencion,
    2
  ),
  Descuento: round(documento?.conta_descuento, 2),
  'Anticipo aplicado': round(documento?.conta_anticipo_aplicado, 2),
  'Monto nota de credito': round(documento?.conta_monto_nota_credito, 2),
  'Centro de costo': toTextValue(documento?.conta_centro_costo),
  Asiento: toTextValue(documento?.conta_cuenta_contable),
  'Orden de compra': toTextValue(documento?.conta_orden_compra),
  'Observaciones contables': toTextValue(documento?.conta_notas)
});

const toExcelHtml = (rows) => {
  const headers = TRAMITE_REPORT_COLUMNS.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const bodyRows = rows
    .map((row) => (
      `<tr>${TRAMITE_REPORT_COLUMNS.map((column) => (
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

export const buildTramiteReportRows = ({
  documentos = [],
  providerGroups = [],
  direction = 'asc'
}) => (
  sortDocumentosByProveedor({
    documentos,
    providerGroups,
    direction
  }).map(toReportRow)
);

export const downloadTramiteReportExcel = ({
  rows,
  sociedadId,
  sociedadLabel,
  tramiteId
}) => {
  const html = toExcelHtml(Array.isArray(rows) ? rows : []);
  const blob = new Blob(
    [`\uFEFF${html}`],
    { type: 'application/vnd.ms-excel;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filenameSociedad = String(sociedadLabel || sociedadId || 'sin_sociedad')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeTramiteId = String(tramiteId || 'sin_tramite').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `reporte_tramite_pago_${safeTramiteId}_${filenameSociedad}_${dateStamp}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
