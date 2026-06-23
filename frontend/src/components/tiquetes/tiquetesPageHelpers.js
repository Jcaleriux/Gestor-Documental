import {
  formatAmount,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
} from '../../utils/formatters.js';
import { TIQUETES_ELECTRONICOS_LABELS } from '../../utils/uiLabels.js';

export const PAGE_SIZE_OPTIONS = [25, 50, 100];

export const TIQUETES_TABLE_HEADERS = Object.freeze([
  {
    key: 'documento',
    label: TIQUETES_ELECTRONICOS_LABELS.columns.documento,
  },
  {
    key: 'emisor',
    label: TIQUETES_ELECTRONICOS_LABELS.columns.emisor,
    sortable: true,
    sortKey: 'emisor',
  },
  {
    key: 'fecha',
    label: TIQUETES_ELECTRONICOS_LABELS.columns.fecha,
    sortable: true,
    sortKey: 'fecha_emision',
  },
  {
    key: 'total',
    label: TIQUETES_ELECTRONICOS_LABELS.columns.total,
    sortable: true,
    sortKey: 'monto',
    align: 'end',
  },
  {
    key: 'acciones',
    label: TIQUETES_ELECTRONICOS_LABELS.columns.acciones,
    align: 'end',
  },
]);

export const formatLabel = (template, values) => Object.entries(values).reduce(
  (label, [key, value]) => label.replace(`{${key}}`, String(value)),
  template,
);

export const buildVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : [];
  }

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
  if (currentPage - 2 > 1) pages.add(currentPage - 2);
  if (currentPage + 2 < totalPages) pages.add(currentPage + 2);

  const ordered = Array.from(pages).sort((a, b) => a - b);
  const result = [];

  ordered.forEach((pageNumber, index) => {
    const previous = ordered[index - 1];
    if (previous && pageNumber - previous > 1) {
      result.push(`ellipsis-${previous}-${pageNumber}`);
    }
    result.push(pageNumber);
  });

  return result;
};

export const buildFilterChips = ({
  search,
  fechaDesde,
  fechaHasta,
  emisorNombre,
  moneda,
  montoMin,
  montoMax,
}) => {
  const chips = [];

  if (search.trim()) chips.push({ key: 'search', label: `Busqueda: ${search.trim()}` });
  if (emisorNombre.trim()) chips.push({ key: 'emisor', label: `Emisor: ${emisorNombre.trim()}` });
  if (moneda) chips.push({ key: 'moneda', label: `Moneda: ${moneda}` });
  if (fechaDesde) chips.push({ key: 'fechaDesde', label: `Desde: ${fechaDesde}` });
  if (fechaHasta) chips.push({ key: 'fechaHasta', label: `Hasta: ${fechaHasta}` });
  if (montoMin !== '') chips.push({ key: 'montoMin', label: `Monto min: ${montoMin}` });
  if (montoMax !== '') chips.push({ key: 'montoMax', label: `Monto max: ${montoMax}` });

  return chips;
};

export const getDocumentoPrincipal = (tiquete) => (
  getDocumentoConsecutivo(tiquete)
);

export const getDocumentoPrincipalCompleto = (tiquete) => (
  getDocumentoConsecutivoCompleto(tiquete)
);

export const getEmisorNombre = (tiquete) => (
  tiquete.emisor?.Nombre
  || tiquete.emisor?.nombre
  || '-'
);

export const getSummaryByMoneda = (summary) => {
  if (!Array.isArray(summary?.byMoneda) || summary.byMoneda.length === 0) {
    return '-';
  }

  return summary.byMoneda
    .map((entry) => `${entry.moneda} ${formatAmount(entry.totalAmount)}`)
    .join('  |  ');
};
