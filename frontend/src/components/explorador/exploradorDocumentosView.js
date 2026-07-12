export const ESTADO_LABELS = Object.freeze({
  no_contabilizado: 'No contabilizada',
  en_revision: 'En revision',
  contabilizado: 'Contabilizada',
  en_tramite_pago: 'En tramite de pago',
  pagado_parcialmente: 'Pago parcial',
  pagado: 'Pagada',
  rechazado: 'Rechazada',
  en_aprobacion: 'En aprobacion',
});

export const formatEstado = (estado) => ESTADO_LABELS[estado]
  || String(estado || 'Sin estado').replaceAll('_', ' ');

export const formatMoney = (amount, currency = 'CRC') => new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: currency || 'CRC',
  maximumFractionDigits: 2,
}).format(Number(amount || 0));

export const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(date);
};

export const getAvailableCurrencies = (resumen) => {
  const values = (resumen?.totalesPorMoneda || []).map((item) => item.moneda).filter(Boolean);
  return [...new Set(values)];
};

export const getMonthlySeries = (resumen, currency, limit = 12) => (
  (resumen?.serieMensual || [])
    .filter((item) => item.moneda === currency)
    .sort((a, b) => String(a.mes).localeCompare(String(b.mes)))
    .slice(-limit)
);

export const getCostCenterLabels = (documento) => {
  const lines = documento?.contabilizacion?.centrosCostoLineas || [];
  const labels = lines.map((line) => (
    line.centro_costo
    || line.centroCosto
    || line.codigo
    || line.nombre
  )).filter(Boolean);
  if (documento?.contabilizacion?.centroCosto) {
    labels.unshift(documento.contabilizacion.centroCosto);
  }
  return [...new Set(labels)];
};
