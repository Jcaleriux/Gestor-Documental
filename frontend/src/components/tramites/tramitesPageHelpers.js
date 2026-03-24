const TRAMITES_DASHBOARD_FILTER_LABELS = Object.freeze({
  en_aprobacion_gerencia: 'En aprobacion gerencia',
  en_aprobacion_gerencia_contable: 'En aprobacion gerencia contable',
  en_aprobacion_gerencia_financiera: 'En aprobacion gerencia financiera',
  en_revision_tesoreria: 'En revision tesoreria',
  en_revision_tesoreria_1: 'En revision tesoreria inicial',
  en_revision_tesoreria_2: 'En tesoreria para pago',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
});

const normalizeReturnTo = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return '';
  }

  return normalized;
};

export const parseTramitesEstadoFromSearch = (search) => {
  const params = new URLSearchParams(search || '');
  const estado = String(params.get('estado') || '').trim();
  return TRAMITES_DASHBOARD_FILTER_LABELS[estado] ? estado : '';
};

export const parseTramitesReturnContextFromSearch = (search) => {
  const params = new URLSearchParams(search || '');
  const returnTo = normalizeReturnTo(params.get('returnTo'));
  const returnLabel = String(params.get('returnLabel') || '').trim();

  return {
    returnTo,
    returnLabel: returnTo ? (returnLabel || 'origen') : '',
  };
};

export const buildTramitesRoute = ({
  estado = '',
  returnTo = '',
  returnLabel = '',
} = {}) => {
  const params = new URLSearchParams();

  if (returnTo) {
    params.set('returnTo', returnTo);
  }

  if (returnLabel) {
    params.set('returnLabel', returnLabel);
  }

  if (estado && TRAMITES_DASHBOARD_FILTER_LABELS[estado]) {
    params.set('estado', estado);
  }

  const query = params.toString();
  return query ? `/tramites?${query}` : '/tramites';
};

export const buildTramitesSearch = (options = {}) => {
  const route = buildTramitesRoute(options);
  return route.includes('?') ? route.slice(route.indexOf('?')) : '';
};

export const getTramitesReturnActionLabel = (returnLabel) => {
  const normalized = String(returnLabel || '').trim();
  if (!normalized) {
    return 'Volver';
  }

  if (normalized.toLowerCase() === 'dashboard') {
    return 'Volver al dashboard';
  }

  return `Volver a ${normalized}`;
};

export const resolveTramitesCreateActionState = ({
  showCreate = false,
  hasSelection = false,
  hasSociedad = false,
} = {}) => ({
  submitsSelection: Boolean(showCreate),
  disabled: showCreate ? !hasSelection : !hasSociedad,
});

export { TRAMITES_DASHBOARD_FILTER_LABELS };
