import {
  formatAmount,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
} from '../../utils/formatters.js';
import { estadoLabelNotaCredito } from '../../utils/estadosNotaCredito.js';
import { NOTAS_CREDITO_LABELS } from '../../utils/uiLabels.js';

export const PAGE_SIZE_OPTIONS = [25, 50, 100];

export const NOTAS_CREDITO_TABLE_HEADERS = Object.freeze([
  {
    key: 'documento',
    label: NOTAS_CREDITO_LABELS.columns.documento,
  },
  {
    key: 'emisor',
    label: NOTAS_CREDITO_LABELS.columns.emisor,
    sortable: true,
    sortKey: 'emisor',
  },
  {
    key: 'fecha',
    label: NOTAS_CREDITO_LABELS.columns.fecha,
    sortable: true,
    sortKey: 'fecha_emision',
  },
  {
    key: 'total',
    label: NOTAS_CREDITO_LABELS.columns.total,
    sortable: true,
    sortKey: 'monto',
    align: 'end',
  },
  {
    key: 'estado',
    label: NOTAS_CREDITO_LABELS.columns.estado,
    sortable: true,
    sortKey: 'estado',
  },
  {
    key: 'acciones',
    label: NOTAS_CREDITO_LABELS.columns.acciones,
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
  estado,
  fechaDesde,
  fechaHasta,
  emisorNombre,
  moneda,
  montoMin,
  montoMax,
}) => {
  const chips = [];

  if (search.trim()) chips.push({ key: 'search', label: `Busqueda: ${search.trim()}` });
  if (estado) chips.push({ key: 'estado', label: `Estado: ${estadoLabelNotaCredito(estado)}` });
  if (emisorNombre.trim()) chips.push({ key: 'emisor', label: `Emisor: ${emisorNombre.trim()}` });
  if (moneda) chips.push({ key: 'moneda', label: `Moneda: ${moneda}` });
  if (fechaDesde) chips.push({ key: 'fechaDesde', label: `Desde: ${fechaDesde}` });
  if (fechaHasta) chips.push({ key: 'fechaHasta', label: `Hasta: ${fechaHasta}` });
  if (montoMin !== '') chips.push({ key: 'montoMin', label: `Monto min: ${montoMin}` });
  if (montoMax !== '') chips.push({ key: 'montoMax', label: `Monto max: ${montoMax}` });

  return chips;
};

export const getDocumentoPrincipal = (nota) => (
  getDocumentoConsecutivo(nota)
);

export const getDocumentoPrincipalCompleto = (nota) => (
  getDocumentoConsecutivoCompleto(nota)
);

export const getEmisorNombre = (nota) => (
  nota.emisor?.Nombre
  || nota.emisor?.nombre
  || '-'
);

export const getSummaryByMoneda = (summary, fieldName) => {
  if (!Array.isArray(summary?.byMoneda) || summary.byMoneda.length === 0) {
    return '-';
  }

  return summary.byMoneda
    .map((entry) => `${entry.moneda} ${formatAmount(entry[fieldName] || 0)}`)
    .join('  |  ');
};
