import { formatAmount } from '../../utils/formatters.js';
import { estadoLabelFactura } from '../../utils/estadosFactura.js';
import { FACTURAS_LABELS } from '../../utils/uiLabels.js';

export const PAGE_SIZE_OPTIONS = [25, 50, 100];

export const DASHBOARD_PRESET_LABELS = Object.freeze({
  no_contabilizadas: 'No contabilizadas',
  por_pagar: 'Total por pagar',
  vencidas: 'Vencidas',
  por_vencer_7: 'Por vencer (7 dias)',
  pagadas: 'Pagadas',
});

export const FACTURAS_TABLE_HEADERS = Object.freeze([
  {
    key: 'documento',
    label: FACTURAS_LABELS.columns.documento,
  },
  {
    key: 'emisor',
    label: FACTURAS_LABELS.columns.emisor,
    sortable: true,
    sortKey: 'emisor',
  },
  {
    key: 'fecha',
    label: FACTURAS_LABELS.columns.fecha,
    sortable: true,
    sortKey: 'fecha_emision',
  },
  {
    key: 'total',
    label: FACTURAS_LABELS.columns.total,
    sortable: true,
    sortKey: 'total_factura',
    align: 'end',
  },
  {
    key: 'estado',
    label: FACTURAS_LABELS.columns.estado,
    sortable: true,
    sortKey: 'estado',
  },
  {
    key: 'acciones',
    label: FACTURAS_LABELS.columns.acciones,
    align: 'end',
  },
]);

export const formatLabel = (template, values) => Object.entries(values).reduce(
  (label, [key, value]) => label.replace(`{${key}}`, String(value)),
  template,
);

export const parseDashboardPresetFromSearch = (search) => {
  const params = new URLSearchParams(search || '');
  const preset = String(params.get('dashboardPreset') || '').trim();
  return DASHBOARD_PRESET_LABELS[preset] ? preset : '';
};

export const normalizeReturnTo = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return '';
  }

  return normalized;
};

export const parseReturnContextFromSearch = (search) => {
  const params = new URLSearchParams(search || '');
  const returnTo = normalizeReturnTo(params.get('returnTo'));
  const returnLabel = String(params.get('returnLabel') || '').trim();

  return {
    returnTo,
    returnLabel: returnTo ? (returnLabel || 'origen') : '',
  };
};

export const buildFacturasRoute = ({
  dashboardPreset = '',
  returnTo = '',
  returnLabel = '',
} = {}) => {
  const params = new URLSearchParams();

  if (dashboardPreset) {
    params.set('dashboardPreset', dashboardPreset);
  }

  if (returnTo) {
    params.set('returnTo', returnTo);
  }

  if (returnLabel) {
    params.set('returnLabel', returnLabel);
  }

  const search = params.toString();
  return search ? `/facturas?${search}` : '/facturas';
};

export const getReturnActionLabel = (returnLabel) => {
  const normalized = String(returnLabel || '').trim();
  if (!normalized) {
    return 'Volver';
  }

  if (normalized.toLowerCase() === 'dashboard') {
    return 'Volver al dashboard';
  }

  return `Volver a ${normalized}`;
};

export const getDocumentoPrincipal = (factura) => (
  factura.consecutivo
  || factura.numero_consecutivo
  || factura.clave
  || `ID ${factura.id}`
);

export const getEmisorNombre = (factura) => (
  factura.emisor?.Nombre
  || factura.emisor?.nombre
  || '-'
);

export const getEmisorIdentificacion = (factura) => (
  factura.emisor?.Identificacion?.Numero
  || factura.emisor?.identificacion?.numero
  || factura.emisor?.NumeroIdentificacion
  || factura.emisor?.numeroIdentificacion
  || ''
);

export const getFacturasSummaryTotal = (summary) => {
  if (!Array.isArray(summary?.byMoneda) || summary.byMoneda.length === 0) {
    return '-';
  }

  return summary.byMoneda
    .map((entry) => `${entry.moneda} ${formatAmount(entry.totalAmount)}`)
    .join('  |  ');
};

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
  dashboardPreset,
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

  if (dashboardPreset) {
    chips.push({
      key: 'dashboardPreset',
      label: `Vista dashboard: ${DASHBOARD_PRESET_LABELS[dashboardPreset]}`,
    });
  }
  if (search.trim()) {
    chips.push({ key: 'search', label: `Busqueda: ${search.trim()}` });
  }
  if (estado) {
    chips.push({ key: 'estado', label: `Estado: ${estadoLabelFactura(estado)}` });
  }
  if (emisorNombre.trim()) {
    chips.push({ key: 'emisor', label: `Emisor: ${emisorNombre.trim()}` });
  }
  if (moneda) {
    chips.push({ key: 'moneda', label: `Moneda: ${moneda}` });
  }
  if (fechaDesde) {
    chips.push({ key: 'fechaDesde', label: `Desde: ${fechaDesde}` });
  }
  if (fechaHasta) {
    chips.push({ key: 'fechaHasta', label: `Hasta: ${fechaHasta}` });
  }
  if (montoMin !== '') {
    chips.push({ key: 'montoMin', label: `Monto min: ${montoMin}` });
  }
  if (montoMax !== '') {
    chips.push({ key: 'montoMax', label: `Monto max: ${montoMax}` });
  }

  return chips;
};
