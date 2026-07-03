import {
  buildDashboardFacturasLink,
  buildDashboardTramitesLink,
} from '../dashboard/dashboardViewModel.js';

const MAX_BADGE_COUNT = 99;

const toCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.trunc(parsed));
};

const countLabel = (count, singular, plural = `${singular}s`) => (
  `${count} ${count === 1 ? singular : plural}`
);

const addNotification = (items, {
  id,
  category,
  title,
  description,
  count,
  tone = 'primary',
  priority = 0,
  to = '',
}) => {
  const safeCount = toCount(count);
  if (safeCount <= 0) {
    return;
  }

  items.push({
    id,
    category,
    title,
    description,
    count: safeCount,
    tone,
    priority,
    to,
  });
};

const getPorEstado = (workQueue, estado) => toCount(workQueue?.tramites?.porEstado?.[estado]);

const buildNotificationItems = (workQueue) => {
  const facturas = workQueue?.facturas || {};
  const tramites = workQueue?.tramites || {};
  const aprobaciones = tramites.aprobacionesPendientes || {};
  const documentosRecientes = workQueue?.documentosRecientes || {};
  const items = [];

  addNotification(items, {
    id: 'rechazos-activos',
    category: 'Rechazos',
    title: 'Rechazos activos',
    description: 'Documentos dentro de tramites activos requieren correccion o seguimiento.',
    count: tramites.rechazadosActivos,
    tone: 'danger',
    priority: 100,
    to: buildDashboardTramitesLink(),
  });

  addNotification(items, {
    id: 'facturas-vencidas',
    category: 'Facturas',
    title: 'Facturas vencidas',
    description: 'Facturas vencidas que siguen pendientes de revision, tramite o pago.',
    count: facturas.vencidas,
    tone: 'danger',
    priority: 95,
    to: buildDashboardFacturasLink('vencidas'),
  });

  addNotification(items, {
    id: 'aprobacion-gerencia',
    category: 'Aprobaciones',
    title: 'Aprobacion de gerencia',
    description: 'Documentos pendientes de decision en la etapa de gerencia.',
    count: aprobaciones.gerencia,
    tone: 'primary',
    priority: 90,
    to: buildDashboardTramitesLink('en_aprobacion_gerencia'),
  });

  addNotification(items, {
    id: 'aprobacion-gerencia-contable',
    category: 'Aprobaciones',
    title: 'Aprobacion gerencia contable',
    description: 'Documentos pendientes de aprobacion contable antes de continuar.',
    count: aprobaciones.gerencia_contable,
    tone: 'primary',
    priority: 89,
    to: buildDashboardTramitesLink('en_aprobacion_gerencia_contable'),
  });

  addNotification(items, {
    id: 'aprobacion-financiera',
    category: 'Aprobaciones',
    title: 'Aprobacion financiera',
    description: 'Documentos pendientes de decision financiera para el pago.',
    count: aprobaciones.financiera,
    tone: 'primary',
    priority: 88,
    to: buildDashboardTramitesLink('en_aprobacion_gerencia_financiera'),
  });

  addNotification(items, {
    id: 'facturas-en-revision',
    category: 'Facturas',
    title: 'Facturas por revisar',
    description: 'Facturas que requieren validacion o ajuste contable.',
    count: facturas.enRevision,
    tone: 'warning',
    priority: 80,
    to: buildDashboardFacturasLink('en_revision'),
  });

  addNotification(items, {
    id: 'facturas-no-contabilizadas',
    category: 'Facturas',
    title: 'Facturas sin contabilizar',
    description: 'Documentos recibidos que aun no han sido contabilizados.',
    count: facturas.noContabilizadas,
    tone: 'secondary',
    priority: 70,
    to: buildDashboardFacturasLink('no_contabilizadas'),
  });

  addNotification(items, {
    id: 'retenciones-pendientes',
    category: 'Facturas',
    title: 'Retenciones pendientes',
    description: 'Retenciones que requieren control antes de cerrar el proceso.',
    count: facturas.retencionesPendientes,
    tone: 'warning',
    priority: 68,
    to: '/retenciones-pendientes',
  });

  addNotification(items, {
    id: 'facturas-por-vencer',
    category: 'Facturas',
    title: 'Vencen en 7 dias',
    description: 'Facturas cercanas a vencimiento que conviene priorizar.',
    count: facturas.porVencer7Dias,
    tone: 'warning',
    priority: 66,
    to: buildDashboardFacturasLink('por_vencer_7'),
  });

  addNotification(items, {
    id: 'facturas-listas-tramite',
    category: 'Facturas',
    title: 'Listas para tramite',
    description: 'Facturas contabilizadas listas para crear o continuar tramite de pago.',
    count: facturas.porPagar,
    tone: 'info',
    priority: 60,
    to: buildDashboardFacturasLink('contabilizadas'),
  });

  addNotification(items, {
    id: 'tramites-revision-tesoreria',
    category: 'Tramites',
    title: 'Revision de tesoreria',
    description: 'Tramites pendientes de revision operativa en tesoreria.',
    count: getPorEstado(workQueue, 'en_revision_tesoreria'),
    tone: 'warning',
    priority: 58,
    to: buildDashboardTramitesLink('en_revision_tesoreria'),
  });

  addNotification(items, {
    id: 'tramites-caratulas',
    category: 'Tramites',
    title: 'Caratulas por preparar',
    description: 'Tramites en tesoreria inicial que requieren preparar caratulas.',
    count: getPorEstado(workQueue, 'en_revision_tesoreria_1'),
    tone: 'info',
    priority: 56,
    to: buildDashboardTramitesLink('en_revision_tesoreria_1'),
  });

  addNotification(items, {
    id: 'tramites-pago',
    category: 'Tramites',
    title: 'Pagos por ejecutar',
    description: 'Tramites en tesoreria listos para gestion de pago.',
    count: getPorEstado(workQueue, 'en_revision_tesoreria_2'),
    tone: 'info',
    priority: 54,
    to: buildDashboardTramitesLink('en_revision_tesoreria_2'),
  });

  addNotification(items, {
    id: 'documentos-con-motivo',
    category: 'Documentos',
    title: 'Documentos con motivo reciente',
    description: 'Movimientos recientes incluyen motivos que pueden requerir seguimiento.',
    count: documentosRecientes.conMotivo,
    tone: 'secondary',
    priority: 40,
    to: '/',
  });

  return items.sort((left, right) => (
    right.priority - left.priority || left.title.localeCompare(right.title)
  ));
};

const buildCategorySummary = (items) => {
  const categories = new Map();

  items.forEach((item) => {
    const current = categories.get(item.category) || {
      category: item.category,
      items: 0,
      count: 0,
    };

    categories.set(item.category, {
      ...current,
      items: current.items + 1,
      count: current.count + item.count,
    });
  });

  return Array.from(categories.values());
};

export const buildNotificationCenterViewModel = (workQueue = {}) => {
  const items = buildNotificationItems(workQueue);
  const totalActionCount = items.reduce((total, item) => total + item.count, 0);
  const badgeCount = items.length;
  const badgeLabel = badgeCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(badgeCount || '');

  return {
    items,
    categorySummary: buildCategorySummary(items),
    totalActionCount,
    badgeCount,
    badgeLabel,
    actionSummary: totalActionCount > 0
      ? countLabel(totalActionCount, 'accion pendiente', 'acciones pendientes')
      : 'Sin acciones pendientes',
    updatedAt: workQueue?.updatedAt || '',
  };
};
