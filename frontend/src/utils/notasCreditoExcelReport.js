import { estadoLabelNotaCredito } from './estadosNotaCredito.js';

const REPORT_COLUMNS = [
  'Documento',
  'Emisor',
  'Fecha Emision',
  'Moneda',
  'Monto Total',
  'Total Aplicado',
  'Saldo Disponible',
  'Estado',
  'PDF Disponible',
  'XML Disponible'
];

const TEXT_COLUMNS = new Set([
  'Documento',
  'Emisor',
  'Fecha Emision',
  'Moneda',
  'Estado',
  'PDF Disponible',
  'XML Disponible'
]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
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

export const buildNotasCreditoReportRows = ({ notasCredito = [] }) => (
  notasCredito
    .map((nota) => ({
      sortTime: getSortTime(nota?.fecha_emision),
      row: {
        Documento: `Nota de credito #${nota?.numero_consecutivo || nota?.id || '-'}`,
        Emisor: nota?.emisor?.Nombre || nota?.emisor?.nombre || '-',
        'Fecha Emision': toDateString(nota?.fecha_emision),
        Moneda: String(
          nota?.moneda
          || nota?.resumen?.CodigoTipoMoneda?.CodigoMoneda
          || nota?.resumen?.CodigoMoneda
          || nota?.resumen?.codigoMoneda
          || 'CRC'
        ).toUpperCase(),
        'Monto Total': round(nota?.monto_total ?? nota?.monto, 2),
        'Total Aplicado': round(nota?.total_aplicado, 2),
        'Saldo Disponible': round(nota?.saldo_disponible, 2),
        Estado: estadoLabelNotaCredito(nota?.estado),
        'PDF Disponible': nota?.ruta_pdf ? 'Si' : 'No',
        'XML Disponible': nota?.ruta_xml ? 'Si' : 'No',
      }
    }))
    .sort((a, b) => b.sortTime - a.sortTime)
    .map((item) => item.row)
);

export const downloadNotasCreditoReportExcel = ({
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
  link.download = `reporte_notas_credito_${safeSociedadId}_${dateStamp}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export { REPORT_COLUMNS };
