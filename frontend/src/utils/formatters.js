const COSTA_RICA_LOCALE = 'es-CR';
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CONSECUTIVO_VISIBLE_LENGTH = 11;

const toDisplayDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  const dateOnlyMatch = text.match(DATE_ONLY_PATTERN);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatAmount = (value) => {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
};

export const formatDate = (value) => {
  const date = toDisplayDate(value);
  if (!date) return '-';
  return date.toLocaleDateString(COSTA_RICA_LOCALE);
};

export const formatDateTime = (value) => {
  const date = toDisplayDate(value);
  if (!date) return '-';
  return date.toLocaleString(COSTA_RICA_LOCALE);
};

export const formatRelativeTime = (value) => {
  if (!value) return 'Sin fecha';
  const now = new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha invalida';
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} dia${diffDays === 1 ? '' : 's'}`;
};

export const formatConsecutivo = (value, fallback = '-') => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return fallback;

  const digits = normalized.replace(/\D/g, '');
  if (digits.length > CONSECUTIVO_VISIBLE_LENGTH) {
    return digits.slice(-CONSECUTIVO_VISIBLE_LENGTH);
  }

  return normalized;
};

export const getDocumentoConsecutivo = (documento, fallback = '-') => (
  formatConsecutivo(
    documento?.consecutivo
    || documento?.numero_consecutivo
    || documento?.clave
    || documento?.factura_id
    || documento?.id,
    fallback
  )
);

export const getDocumentoConsecutivoCompleto = (documento, fallback = '') => (
  String(
    documento?.consecutivo
    || documento?.numero_consecutivo
    || documento?.clave
    || documento?.factura_id
    || documento?.id
    || fallback
  ).trim()
);

export const getMoneda = (doc) => (
  doc?.resumen?.CodigoTipoMoneda?.CodigoMoneda ||
  doc?.resumen?.CodigoMoneda ||
  doc?.resumen?.codigoMoneda ||
  'CRC'
);

export const getMontoDocumento = (doc, options = {}) => {
  const { preferAjustado = false } = options;
  const candidates = preferAjustado
    ? [
      doc?.total_a_pagar,
      doc?.total_factura,
      doc?.resumen?.TotalComprobante
    ]
    : [
      doc?.total_factura,
      doc?.total_a_pagar,
      doc?.resumen?.TotalComprobante
    ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};
