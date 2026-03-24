import { formatAmount } from '../../utils/formatters.js';

export const formatCurrencyAmount = (moneda, monto) => `${moneda} ${formatAmount(monto)}`;

export const buildDashboardFacturasLink = (dashboardPreset) => {
  const params = new URLSearchParams({
    dashboardPreset,
    returnTo: '/',
    returnLabel: 'Dashboard',
  });

  return `/facturas?${params.toString()}`;
};

export const buildDashboardTramitesLink = (estado = '') => {
  const params = new URLSearchParams({
    returnTo: '/',
    returnLabel: 'Dashboard',
  });

  if (estado) {
    params.set('estado', estado);
  }

  return `/tramites?${params.toString()}`;
};

const TOP_PROVIDER_CURRENCIES = ['CRC', 'USD'];

const toCount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildCountBreakdown = (totalesPorMoneda, group) => (
  Object.entries(totalesPorMoneda || {})
    .map(([moneda, groups]) => ({
      moneda,
      documentos: toCount(groups?.[group]?.count, 0),
    }))
    .filter((entry) => entry.documentos > 0)
);

const buildMetricCard = ({
  title,
  value,
  tone,
  icon,
  breakdownLabel = '',
  breakdownItems = [],
  breakdownType = 'amount',
  emptyLabel = 'Sin datos',
  summaryText = '',
  linkTo = '',
}) => ({
  title,
  value,
  tone,
  icon,
  breakdownLabel,
  breakdownItems,
  breakdownType,
  emptyLabel,
  summaryText,
  linkTo,
});

const buildTopProviders = (topProveedoresPorPagar) => (
  TOP_PROVIDER_CURRENCIES
    .map((moneda) => [
      moneda,
      Array.isArray(topProveedoresPorPagar?.[moneda])
        ? topProveedoresPorPagar[moneda].slice(0, 3)
        : [],
    ])
    .filter(([, proveedores]) => proveedores.length > 0)
);

const buildMetricCards = (stats) => {
  const resumenEstados = stats.resumenEstados || {};
  const totalesPorMoneda = stats.totalesPorMoneda || {};

  return [
    buildMetricCard({
      title: 'Facturas no contabilizadas',
      value: toCount(resumenEstados.no_contabilizadas, 0),
      breakdownLabel: 'Por moneda',
      breakdownItems: buildCountBreakdown(totalesPorMoneda, 'no_contabilizadas'),
      breakdownType: 'count',
      emptyLabel: 'Sin facturas pendientes',
      tone: 'info',
      icon: 'NC',
      linkTo: buildDashboardFacturasLink('no_contabilizadas'),
    }),
    buildMetricCard({
      title: 'Facturas disponibles para tramitar',
      value: toCount(resumenEstados.contabilizadas, 0),
      breakdownLabel: 'Por moneda',
      breakdownItems: buildCountBreakdown(totalesPorMoneda, 'contabilizadas'),
      breakdownType: 'count',
      emptyLabel: 'Sin facturas contabilizadas',
      tone: 'primary',
      icon: 'CT',
      linkTo: buildDashboardFacturasLink('contabilizadas'),
    }),
    buildMetricCard({
      title: 'En tramite de pagos',
      value: toCount(resumenEstados.en_tramite, 0),
      breakdownLabel: 'Por moneda',
      breakdownItems: buildCountBreakdown(totalesPorMoneda, 'en_tramite'),
      breakdownType: 'count',
      emptyLabel: 'Sin facturas en tramite',
      tone: 'primary',
      icon: 'TP',
      linkTo: buildDashboardFacturasLink('en_tramite'),
    }),
    buildMetricCard({
      title: 'Pagadas',
      value: toCount(stats.pagadas?.documentos, toCount(resumenEstados.pagadas, 0)),
      breakdownLabel: 'Monto pagado por moneda',
      breakdownItems: Array.isArray(stats.pagadas?.montosPorMoneda)
        ? stats.pagadas.montosPorMoneda
        : [],
      breakdownType: 'amount',
      emptyLabel: 'Sin facturas pagadas',
      tone: 'success',
      icon: 'PG',
      linkTo: buildDashboardFacturasLink('pagadas'),
    }),
    buildMetricCard({
      title: 'En revision contabilidad',
      value: toCount(stats.enRevision, 0),
      summaryText: 'Facturas que requieren validacion o ajuste contable.',
      tone: 'warning',
      icon: 'RC',
      linkTo: buildDashboardFacturasLink('en_revision'),
    }),
    buildMetricCard({
      title: 'Por vencer 7 dias',
      value: toCount(stats.porVencer7Dias?.documentos, 0),
      breakdownLabel: 'Monto por moneda',
      breakdownItems: Array.isArray(stats.porVencer7Dias?.montosPorMoneda)
        ? stats.porVencer7Dias.montosPorMoneda
        : [],
      breakdownType: 'amount',
      emptyLabel: 'Sin vencimientos cercanos',
      tone: 'warning',
      icon: '7D',
      linkTo: buildDashboardFacturasLink('por_vencer_7'),
    }),
    buildMetricCard({
      title: 'Vencidas',
      value: toCount(stats.vencidas?.documentos, 0),
      breakdownLabel: 'Monto vencido por moneda',
      breakdownItems: Array.isArray(stats.vencidas?.montosPorMoneda)
        ? stats.vencidas.montosPorMoneda
        : [],
      breakdownType: 'amount',
      emptyLabel: 'Sin facturas vencidas',
      tone: 'danger',
      icon: 'VC',
      linkTo: buildDashboardFacturasLink('vencidas'),
    }),
    buildMetricCard({
      title: 'Recibidas ultimo mes',
      value: toCount(stats.totalMes, 0),
      summaryText: 'Facturas recibidas en los ultimos 30 dias.',
      tone: 'secondary',
      icon: 'UM',
      linkTo: buildDashboardFacturasLink('recibidas_ultimo_mes'),
    }),
  ];
};

export const buildDashboardViewModel = ({
  stats = {},
  recentDocs = [],
  selectedSociedadName = '',
} = {}) => {
  const safeStats = stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : {};
  const safeRecentDocs = Array.isArray(recentDocs) ? recentDocs : [];
  const totalesPorMoneda = safeStats.totalesPorMoneda || {};

  return {
    cards: buildMetricCards(safeStats),
    dashboardProfile: 'general',
    monedas: Object.keys(totalesPorMoneda).sort((left, right) => left.localeCompare(right)),
    topProveedoresPorMoneda: buildTopProviders(safeStats.topProveedoresPorPagar || {}),
    totalesPorMoneda,
    visibleRecentDocs: safeRecentDocs.slice(0, 4),
    visibleSociedadName: selectedSociedadName,
  };
};
