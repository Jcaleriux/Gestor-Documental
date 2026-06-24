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

const buildCurrencySummary = (totalesPorMoneda) => (
  Object.entries(totalesPorMoneda || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([moneda, groups]) => ({
      moneda,
      items: [
        {
          key: 'no_contabilizadas',
          label: 'No contabilizadas',
          count: toCount(groups?.no_contabilizadas?.count, 0),
          total: toCount(groups?.no_contabilizadas?.total, 0),
        },
        {
          key: 'contabilizadas',
          label: 'Contabilizadas',
          count: toCount(groups?.contabilizadas?.count, 0),
          total: toCount(groups?.contabilizadas?.total, 0),
        },
        {
          key: 'en_tramite',
          label: 'En trámite',
          count: toCount(groups?.en_tramite?.count, 0),
          total: toCount(groups?.en_tramite?.total, 0),
        },
        {
          key: 'pagadas',
          label: 'Pagadas',
          count: toCount(groups?.pagadas?.count, 0),
          total: toCount(groups?.pagadas?.total, 0),
        },
      ],
    }))
);

const buildStatusDistribution = (stats) => {
  const resumenEstados = stats.resumenEstados || {};
  const items = [
    {
      key: 'no_contabilizadas',
      label: 'No contabilizadas',
      value: toCount(resumenEstados.no_contabilizadas, 0),
      tone: 'secondary',
    },
    {
      key: 'en_revision',
      label: 'En revisión contable',
      value: toCount(stats.enRevision, 0),
      tone: 'warning',
    },
    {
      key: 'contabilizadas',
      label: 'Listas para trámite',
      value: toCount(resumenEstados.contabilizadas, 0),
      tone: 'primary',
    },
    {
      key: 'en_tramite',
      label: 'En trámite de pago',
      value: toCount(resumenEstados.en_tramite, 0),
      tone: 'info',
    },
    {
      key: 'pagadas',
      label: 'Pagadas',
      value: toCount(stats.pagadas?.documentos, toCount(resumenEstados.pagadas, 0)),
      tone: 'success',
    },
    {
      key: 'vencidas',
      label: 'Vencidas',
      value: toCount(stats.vencidas?.documentos, 0),
      tone: 'danger',
    },
  ];
  const maxValue = Math.max(...items.map((item) => item.value), 0);

  return items.map((item) => ({
    ...item,
    percentage: maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0,
  }));
};

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
      tone: 'secondary',
      linkTo: buildDashboardFacturasLink('no_contabilizadas'),
    }),
    buildMetricCard({
      title: 'Listas para trámite',
      value: toCount(resumenEstados.contabilizadas, 0),
      breakdownLabel: 'Por moneda',
      breakdownItems: buildCountBreakdown(totalesPorMoneda, 'contabilizadas'),
      breakdownType: 'count',
      emptyLabel: 'Sin facturas contabilizadas',
      tone: 'primary',
      linkTo: buildDashboardFacturasLink('contabilizadas'),
    }),
    buildMetricCard({
      title: 'Vencidas',
      value: toCount(stats.vencidas?.documentos, 0),
      breakdownLabel: 'Vencido por moneda',
      breakdownItems: Array.isArray(stats.vencidas?.montosPorMoneda)
        ? stats.vencidas.montosPorMoneda
        : [],
      breakdownType: 'amount',
      emptyLabel: 'Sin facturas vencidas',
      tone: 'danger',
      linkTo: buildDashboardFacturasLink('vencidas'),
    }),
    buildMetricCard({
      title: 'En trámite de pago',
      value: toCount(resumenEstados.en_tramite, 0),
      breakdownLabel: 'Por moneda',
      breakdownItems: buildCountBreakdown(totalesPorMoneda, 'en_tramite'),
      breakdownType: 'count',
      emptyLabel: 'Sin facturas en trámite',
      tone: 'info',
      linkTo: buildDashboardFacturasLink('en_tramite'),
    }),
    buildMetricCard({
      title: 'En revisión contable',
      value: toCount(stats.enRevision, 0),
      summaryText: 'Facturas que requieren validación o ajuste contable.',
      tone: 'warning',
      linkTo: buildDashboardFacturasLink('en_revision'),
    }),
    buildMetricCard({
      title: 'Vencen en 7 días',
      value: toCount(stats.porVencer7Dias?.documentos, 0),
      breakdownLabel: 'Monto por moneda',
      breakdownItems: Array.isArray(stats.porVencer7Dias?.montosPorMoneda)
        ? stats.porVencer7Dias.montosPorMoneda
        : [],
      breakdownType: 'amount',
      emptyLabel: 'Sin vencimientos cercanos',
      tone: 'warning',
      linkTo: buildDashboardFacturasLink('por_vencer_7'),
    }),
    buildMetricCard({
      title: 'Pagadas',
      value: toCount(stats.pagadas?.documentos, toCount(resumenEstados.pagadas, 0)),
      breakdownLabel: 'Pagado por moneda',
      breakdownItems: Array.isArray(stats.pagadas?.montosPorMoneda)
        ? stats.pagadas.montosPorMoneda
        : [],
      breakdownType: 'amount',
      emptyLabel: 'Sin facturas pagadas',
      tone: 'success',
      linkTo: buildDashboardFacturasLink('pagadas'),
    }),
    buildMetricCard({
      title: 'Recibidas últimos 30 días',
      value: toCount(stats.totalMes, 0),
      summaryText: 'Facturas recibidas en los últimos 30 días.',
      tone: 'secondary',
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
    currencySummary: buildCurrencySummary(totalesPorMoneda),
    dashboardProfile: 'general',
    monedas: Object.keys(totalesPorMoneda).sort((left, right) => left.localeCompare(right)),
    statusDistribution: buildStatusDistribution(safeStats),
    topProveedoresPorMoneda: buildTopProviders(safeStats.topProveedoresPorPagar || {}),
    totalesPorMoneda,
    visibleRecentDocs: safeRecentDocs.slice(0, 4),
    visibleSociedadName: selectedSociedadName,
  };
};
