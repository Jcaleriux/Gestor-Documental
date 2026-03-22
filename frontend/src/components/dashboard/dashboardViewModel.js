import { formatAmount } from '../../utils/formatters.js';
import {
  DASHBOARD_PROFILES,
  getDashboardProfile,
  getDashboardProfileCopy,
} from '../../utils/dashboardProfiles.js';

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

const createPermissionHelpers = (userPermissions) => {
  const permissionSet = new Set(Array.isArray(userPermissions) ? userPermissions : []);
  const hasPermission = (permission) => permissionSet.has('acceso_total') || permissionSet.has(permission);
  const hasAnyPermission = (permissions) => permissions.some((permission) => hasPermission(permission));

  return {
    permissionSet,
    hasPermission,
    hasAnyPermission,
    canOpenFacturas: hasPermission('documentos_ver'),
    canOpenRetenciones: hasPermission('documentos_ver'),
    canOpenTramites: hasPermission('documentos_ver') || hasAnyPermission([
      'documentos_tramitar_pago',
      'documentos_aprobar_gerencia',
      'documentos_aprobar_gerencia_contable',
      'documentos_aprobar_gerencia_financiera',
      'documentos_marcar_pagado',
    ]),
  };
};

const buildNoContabilizadasBreakdown = (totalesPorMoneda) => (
  Object.entries(totalesPorMoneda || {})
    .map(([moneda, row]) => ({
      moneda,
      documentos: Number(row?.no_contabilizadas?.count || 0),
    }))
    .filter((entry) => entry.documentos > 0)
);

const countTopProveedores = (topProveedoresPorPagar) => (
  Object.values(topProveedoresPorPagar || {}).reduce(
    (total, proveedores) => total + (Array.isArray(proveedores) ? proveedores.length : 0),
    0,
  )
);

const toCount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const countRecentDocsWithMotivo = (recentDocs) => (
  (Array.isArray(recentDocs) ? recentDocs : []).filter((item) => String(item?.motivo || '').trim()).length
);

const buildQueueItem = ({
  label,
  value,
  description,
  tone = 'primary',
  to = '',
}) => ({
  label,
  value,
  description,
  tone,
  to,
});

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

const buildMetricCards = ({
  dashboardProfile,
  stats,
  recentDocs,
  monedas,
  cuentasPorPagar,
  vencidas,
  porVencer7Dias,
  retencionesPendientes,
  pagadas,
  noContabilizadasPorMoneda,
  canOpenFacturas = false,
}) => {
  const resumenEstados = stats.resumenEstados || {};
  const cards = {
    totalPorPagar: buildMetricCard({
      title: 'Total por pagar',
      value: cuentasPorPagar.documentos ?? 0,
      breakdownLabel: 'Neto por moneda',
      breakdownItems: cuentasPorPagar.montosPorMoneda || [],
      breakdownType: 'amount',
      emptyLabel: 'Sin montos pendientes',
      tone: 'primary',
      icon: 'TP',
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('por_pagar') : '',
    }),
    vencidas: buildMetricCard({
      title: 'Vencidas',
      value: vencidas.documentos ?? 0,
      breakdownLabel: 'Monto vencido por moneda',
      breakdownItems: vencidas.montosPorMoneda || [],
      breakdownType: 'amount',
      emptyLabel: 'Sin facturas vencidas',
      tone: 'danger',
      icon: 'V',
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('vencidas') : '',
    }),
    porVencer: buildMetricCard({
      title: 'Por vencer (7 dias)',
      value: porVencer7Dias.documentos ?? 0,
      breakdownLabel: 'Monto por vencer por moneda',
      breakdownItems: porVencer7Dias.montosPorMoneda || [],
      breakdownType: 'amount',
      emptyLabel: 'Sin vencimientos proximos',
      tone: 'warning',
      icon: '7D',
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('por_vencer_7') : '',
    }),
    retencion: buildMetricCard({
      title: 'Retencion pendiente',
      value: retencionesPendientes.documentos ?? 0,
      breakdownLabel: 'Retencion por moneda',
      breakdownItems: retencionesPendientes.montosPorMoneda || [],
      breakdownType: 'amount',
      emptyLabel: 'Sin retenciones pendientes',
      tone: 'info',
      icon: 'RP',
    }),
    pagadas: buildMetricCard({
      title: 'Pagadas',
      value: pagadas.documentos ?? 0,
      breakdownLabel: 'Monto pagado por moneda',
      breakdownItems: pagadas.montosPorMoneda || [],
      breakdownType: 'amount',
      emptyLabel: 'Sin facturas pagadas',
      tone: 'success',
      icon: 'PG',
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('pagadas') : '',
    }),
    noContabilizadas: buildMetricCard({
      title: 'No contabilizadas',
      value: resumenEstados.no_contabilizadas ?? 0,
      breakdownLabel: 'Documentos por moneda',
      breakdownItems: noContabilizadasPorMoneda,
      breakdownType: 'count',
      emptyLabel: 'Sin documentos pendientes',
      tone: 'info',
      icon: 'NC',
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('no_contabilizadas') : '',
    }),
    enRevision: buildMetricCard({
      title: 'En revision',
      value: stats.enRevision ?? 0,
      summaryText: 'Documentos que requieren validacion o ajuste.',
      tone: 'warning',
      icon: 'ER',
    }),
    enTramite: buildMetricCard({
      title: 'En tramite',
      value: resumenEstados.en_tramite ?? 0,
      summaryText: 'Documentos avanzando en flujo de pago.',
      tone: 'primary',
      icon: 'ET',
    }),
    totalFacturas: buildMetricCard({
      title: 'Total documentos',
      value: stats.totalFacturas ?? 0,
      summaryText: `Ingresadas este mes: ${stats.totalMes ?? 0}`,
      tone: 'primary',
      icon: 'TD',
    }),
    recientes: buildMetricCard({
      title: 'Actualizaciones',
      value: recentDocs.length,
      summaryText: recentDocs.length > 0
        ? `${recentDocs.length} cambios recientes visibles en esta sociedad.`
        : 'Sin movimientos recientes.',
      tone: 'info',
      icon: 'AR',
    }),
    monedas: buildMetricCard({
      title: 'Monedas activas',
      value: monedas.length,
      summaryText: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.',
      tone: 'secondary',
      icon: 'MX',
    }),
  };

  switch (dashboardProfile) {
    case DASHBOARD_PROFILES.ADMIN:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.pagadas,
        cards.noContabilizadas,
        cards.recientes,
        cards.monedas,
      ];
    case DASHBOARD_PROFILES.TESORERIA:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.porVencer,
        cards.pagadas,
        cards.retencion,
        cards.noContabilizadas,
      ];
    case DASHBOARD_PROFILES.CONTABILIDAD:
      return [
        cards.noContabilizadas,
        cards.enRevision,
        cards.retencion,
        cards.pagadas,
        cards.recientes,
        cards.monedas,
      ];
    case DASHBOARD_PROFILES.GERENCIA:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.porVencer,
        cards.pagadas,
        cards.enTramite,
        cards.recientes,
      ];
    case DASHBOARD_PROFILES.ASISTENTE:
      return [
        cards.noContabilizadas,
        cards.enRevision,
        cards.porVencer,
        cards.pagadas,
        cards.recientes,
        cards.monedas,
      ];
    case DASHBOARD_PROFILES.CONSULTA:
      return [
        cards.totalFacturas,
        cards.noContabilizadas,
        cards.enTramite,
        cards.pagadas,
        cards.recientes,
        cards.monedas,
      ];
    default:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.porVencer,
        cards.pagadas,
        cards.noContabilizadas,
        cards.recientes,
      ];
  }
};

const normalizeWorkQueue = ({
  workQueue,
  stats,
  recentDocs,
} = {}) => {
  const safeWorkQueue = workQueue && typeof workQueue === 'object' && !Array.isArray(workQueue)
    ? workQueue
    : {};
  const facturas = safeWorkQueue.facturas && typeof safeWorkQueue.facturas === 'object'
    ? safeWorkQueue.facturas
    : {};
  const tramites = safeWorkQueue.tramites && typeof safeWorkQueue.tramites === 'object'
    ? safeWorkQueue.tramites
    : {};
  const tramitesPorEstado = tramites.porEstado && typeof tramites.porEstado === 'object'
    ? tramites.porEstado
    : {};
  const aprobacionesPendientes = tramites.aprobacionesPendientes && typeof tramites.aprobacionesPendientes === 'object'
    ? tramites.aprobacionesPendientes
    : {};
  const documentosRecientes = safeWorkQueue.documentosRecientes && typeof safeWorkQueue.documentosRecientes === 'object'
    ? safeWorkQueue.documentosRecientes
    : {};
  const sociedades = safeWorkQueue.sociedades && typeof safeWorkQueue.sociedades === 'object'
    ? safeWorkQueue.sociedades
    : {};

  return {
    updatedAt: String(safeWorkQueue.updatedAt || '').trim(),
    facturas: {
      noContabilizadas: toCount(facturas.noContabilizadas, toCount(stats.noContabilizado)),
      enRevision: toCount(facturas.enRevision, toCount(stats.enRevision)),
      porPagar: toCount(facturas.porPagar, toCount(stats.cuentasPorPagar?.documentos)),
      vencidas: toCount(facturas.vencidas, toCount(stats.vencidas?.documentos)),
      porVencer7Dias: toCount(facturas.porVencer7Dias, toCount(stats.porVencer7Dias?.documentos)),
      retencionesPendientes: toCount(
        facturas.retencionesPendientes,
        toCount(stats.retencionesPendientes?.documentos),
      ),
      enTramite: toCount(facturas.enTramite, toCount(stats.resumenEstados?.en_tramite)),
      pagadas: toCount(facturas.pagadas, toCount(stats.pagadas?.documentos)),
    },
    tramites: {
      activos: toCount(tramites.activos),
      porEstado: {
        en_aprobacion_gerencia: toCount(tramitesPorEstado.en_aprobacion_gerencia),
        en_aprobacion_gerencia_contable: toCount(tramitesPorEstado.en_aprobacion_gerencia_contable),
        en_aprobacion_gerencia_financiera: toCount(tramitesPorEstado.en_aprobacion_gerencia_financiera),
        en_revision_tesoreria: toCount(tramitesPorEstado.en_revision_tesoreria),
        en_revision_tesoreria_1: toCount(tramitesPorEstado.en_revision_tesoreria_1),
        en_revision_tesoreria_2: toCount(tramitesPorEstado.en_revision_tesoreria_2),
        pagado: toCount(tramitesPorEstado.pagado),
        cancelado: toCount(tramitesPorEstado.cancelado),
      },
      aprobacionesPendientes: {
        gerencia: toCount(aprobacionesPendientes.gerencia),
        gerencia_contable: toCount(aprobacionesPendientes.gerencia_contable),
        financiera: toCount(aprobacionesPendientes.financiera),
      },
      rechazadosActivos: toCount(tramites.rechazadosActivos),
    },
    documentosRecientes: {
      total: toCount(documentosRecientes.total, Array.isArray(recentDocs) ? recentDocs.length : 0),
      conMotivo: toCount(documentosRecientes.conMotivo, countRecentDocsWithMotivo(recentDocs)),
    },
    sociedades: {
      visibles: toCount(sociedades.visibles, toCount(stats.totalSociedades)),
    },
  };
};

const buildPrimaryQueueItems = ({
  dashboardProfile,
  workQueue,
  canOpenFacturas,
  canOpenTramites,
  canOpenRetenciones,
}) => {
  switch (dashboardProfile) {
    case DASHBOARD_PROFILES.ADMIN:
      return [
        buildQueueItem({
          label: 'Pendientes documentales',
          value: workQueue.facturas.noContabilizadas + workQueue.facturas.enRevision,
          description: 'Backlog base entre no contabilizadas y en revision.',
          tone: 'info',
          to: canOpenFacturas ? buildDashboardFacturasLink('no_contabilizadas') : '',
        }),
        buildQueueItem({
          label: 'Tramites activos',
          value: workQueue.tramites.activos,
          description: 'Flujo vivo que sigue moviendose en aprobaciones y tesoreria.',
          tone: 'primary',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
        buildQueueItem({
          label: 'Rechazos activos',
          value: workQueue.tramites.rechazadosActivos,
          description: 'Casos observados que pueden estar bloqueando avance.',
          tone: 'danger',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
        buildQueueItem({
          label: 'Sociedades visibles',
          value: workQueue.sociedades.visibles,
          description: 'Cobertura actual de este tablero por acceso y sociedad.',
          tone: 'secondary',
        }),
      ];
    case DASHBOARD_PROFILES.TESORERIA:
      return [
        buildQueueItem({
          label: 'Cola por pagar',
          value: workQueue.facturas.porPagar,
          description: 'Documentos listos para seguimiento financiero.',
          tone: 'primary',
          to: canOpenFacturas ? buildDashboardFacturasLink('por_pagar') : '',
        }),
        buildQueueItem({
          label: 'Vencidas',
          value: workQueue.facturas.vencidas,
          description: 'Atencion inmediata para no dejar pagos fuera de fecha.',
          tone: 'danger',
          to: canOpenFacturas ? buildDashboardFacturasLink('vencidas') : '',
        }),
        buildQueueItem({
          label: 'Proximos 7 dias',
          value: workQueue.facturas.porVencer7Dias,
          description: 'Casos que conviene preparar antes del cierre cercano.',
          tone: 'warning',
          to: canOpenFacturas ? buildDashboardFacturasLink('por_vencer_7') : '',
        }),
        buildQueueItem({
          label: 'Listos para pago',
          value: workQueue.tramites.porEstado.en_revision_tesoreria_2,
          description: 'Tramites en tesoreria final que ya pueden cerrarse.',
          tone: 'success',
          to: canOpenTramites ? buildDashboardTramitesLink('en_revision_tesoreria_2') : '',
        }),
      ];
    case DASHBOARD_PROFILES.CONTABILIDAD:
      return [
        buildQueueItem({
          label: 'Backlog documental',
          value: workQueue.facturas.noContabilizadas,
          description: 'Documentos aun fuera del flujo de pago.',
          tone: 'info',
          to: canOpenFacturas ? buildDashboardFacturasLink('no_contabilizadas') : '',
        }),
        buildQueueItem({
          label: 'En revision',
          value: workQueue.facturas.enRevision,
          description: 'Casos que requieren completar o corregir soporte.',
          tone: 'warning',
          to: canOpenFacturas ? buildDashboardFacturasLink('en_revision') : '',
        }),
        buildQueueItem({
          label: 'En tramite',
          value: workQueue.facturas.enTramite,
          description: 'Documentos que ya avanzaron y conviene monitorear.',
          tone: 'primary',
          to: canOpenFacturas ? buildDashboardFacturasLink('en_tramite') : '',
        }),
        buildQueueItem({
          label: 'Retenciones abiertas',
          value: workQueue.facturas.retencionesPendientes,
          description: 'Retenciones con saldo pendiente y seguimiento contable.',
          tone: 'secondary',
          to: canOpenRetenciones ? '/retenciones-pendientes' : '',
        }),
      ];
    case DASHBOARD_PROFILES.GERENCIA:
      return [
        buildQueueItem({
          label: 'Pendientes gerencia',
          value: workQueue.tramites.aprobacionesPendientes.gerencia,
          description: 'Documentos esperando decision gerencial.',
          tone: 'primary',
          to: canOpenTramites ? buildDashboardTramitesLink('en_aprobacion_gerencia') : '',
        }),
        buildQueueItem({
          label: 'Gerencia contable',
          value: workQueue.tramites.aprobacionesPendientes.gerencia_contable,
          description: 'Aprobaciones que requieren criterio contable.',
          tone: 'warning',
          to: canOpenTramites ? buildDashboardTramitesLink('en_aprobacion_gerencia_contable') : '',
        }),
        buildQueueItem({
          label: 'Gerencia financiera',
          value: workQueue.tramites.aprobacionesPendientes.financiera,
          description: 'Tramites que necesitan autorizacion financiera.',
          tone: 'info',
          to: canOpenTramites ? buildDashboardTramitesLink('en_aprobacion_gerencia_financiera') : '',
        }),
        buildQueueItem({
          label: 'Rechazados activos',
          value: workQueue.tramites.rechazadosActivos,
          description: 'Casos observados que conviene revisar antes de aprobar mas.',
          tone: 'danger',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
      ];
    case DASHBOARD_PROFILES.ASISTENTE:
      return [
        buildQueueItem({
          label: 'Trabajo del dia',
          value: workQueue.facturas.noContabilizadas,
          description: 'Backlog base para preparar, ordenar o escalar.',
          tone: 'info',
          to: canOpenFacturas ? buildDashboardFacturasLink('no_contabilizadas') : '',
        }),
        buildQueueItem({
          label: 'En revision',
          value: workQueue.facturas.enRevision,
          description: 'Casos que requieren seguimiento o contexto adicional.',
          tone: 'warning',
          to: canOpenFacturas ? buildDashboardFacturasLink('en_revision') : '',
        }),
        buildQueueItem({
          label: 'Vencimientos proximos',
          value: workQueue.facturas.porVencer7Dias,
          description: 'Documentos que conviene elevar antes de que venzan.',
          tone: 'primary',
          to: canOpenFacturas ? buildDashboardFacturasLink('por_vencer_7') : '',
        }),
        buildQueueItem({
          label: 'En tramite',
          value: workQueue.facturas.enTramite,
          description: 'Flujo ya encaminado para dar seguimiento sin perder contexto.',
          tone: 'secondary',
          to: canOpenFacturas ? buildDashboardFacturasLink('en_tramite') : '',
        }),
      ];
    case DASHBOARD_PROFILES.CONSULTA:
      return [
        buildQueueItem({
          label: 'Pendientes observables',
          value: workQueue.facturas.noContabilizadas + workQueue.facturas.enRevision,
          description: 'Casos que vale la pena monitorear sin tocar estados criticos.',
          tone: 'info',
          to: canOpenFacturas ? buildDashboardFacturasLink('no_contabilizadas') : '',
        }),
        buildQueueItem({
          label: 'En tramite',
          value: workQueue.facturas.enTramite,
          description: 'Documentos ya en el flujo para consulta y trazabilidad.',
          tone: 'primary',
          to: canOpenFacturas ? buildDashboardFacturasLink('en_tramite') : '',
        }),
        buildQueueItem({
          label: 'Pagadas',
          value: workQueue.facturas.pagadas,
          description: 'Casos cerrados que siguen siendo utiles para seguimiento.',
          tone: 'success',
          to: canOpenFacturas ? buildDashboardFacturasLink('pagadas') : '',
        }),
        buildQueueItem({
          label: 'Cambios recientes',
          value: workQueue.documentosRecientes.total,
          description: 'Movimientos visibles para revisar contexto reciente.',
          tone: 'secondary',
        }),
      ];
    default:
      return [
        buildQueueItem({
          label: 'Pendientes',
          value: workQueue.facturas.noContabilizadas + workQueue.facturas.enRevision,
          description: 'Documentos que siguen necesitando accion operativa.',
          tone: 'info',
          to: canOpenFacturas ? buildDashboardFacturasLink('no_contabilizadas') : '',
        }),
        buildQueueItem({
          label: 'Vencidas',
          value: workQueue.facturas.vencidas,
          description: 'Casos con riesgo inmediato por fecha de pago.',
          tone: 'danger',
          to: canOpenFacturas ? buildDashboardFacturasLink('vencidas') : '',
        }),
        buildQueueItem({
          label: 'Tramites activos',
          value: workQueue.tramites.activos,
          description: 'Workflow que conviene revisar antes de actuar.',
          tone: 'primary',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
        buildQueueItem({
          label: 'Cambios recientes',
          value: workQueue.documentosRecientes.total,
          description: 'Actividad visible del tablero operativo.',
          tone: 'secondary',
        }),
      ];
  }
};

const buildSecondaryAlerts = ({
  dashboardProfile,
  workQueue,
  canOpenFacturas,
  canOpenTramites,
  canOpenRetenciones,
}) => {
  const reviewTesoreria = workQueue.tramites.porEstado.en_revision_tesoreria
    + workQueue.tramites.porEstado.en_revision_tesoreria_1;

  switch (dashboardProfile) {
    case DASHBOARD_PROFILES.ADMIN:
      return [
        buildQueueItem({
          label: 'Actividad reciente',
          value: workQueue.documentosRecientes.total,
          description: 'Cambios visibles en la muestra reciente del tablero.',
          tone: 'secondary',
        }),
        buildQueueItem({
          label: 'Cambios con motivo',
          value: workQueue.documentosRecientes.conMotivo,
          description: 'Actualizaciones recientes con contexto explicito.',
          tone: 'warning',
        }),
        buildQueueItem({
          label: 'Vencidas',
          value: workQueue.facturas.vencidas,
          description: 'Riesgo financiero visible para priorizar apoyo.',
          tone: 'danger',
          to: canOpenFacturas ? buildDashboardFacturasLink('vencidas') : '',
        }),
      ];
    case DASHBOARD_PROFILES.TESORERIA:
      return [
        buildQueueItem({
          label: 'Revision tesoreria',
          value: reviewTesoreria,
          description: 'Casos todavia en validacion financiera antes del pago.',
          tone: 'warning',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
        buildQueueItem({
          label: 'Retenciones pendientes',
          value: workQueue.facturas.retencionesPendientes,
          description: 'Saldo retenido que conviene monitorear en paralelo.',
          tone: 'info',
          to: canOpenRetenciones ? '/retenciones-pendientes' : '',
        }),
        buildQueueItem({
          label: 'Tramites activos',
          value: workQueue.tramites.activos,
          description: 'Carga viva del flujo para el equipo financiero.',
          tone: 'secondary',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
      ];
    case DASHBOARD_PROFILES.CONTABILIDAD:
      return [
        buildQueueItem({
          label: 'Vencidas',
          value: workQueue.facturas.vencidas,
          description: 'Conviene revisar si la documentacion afecta el pago.',
          tone: 'danger',
          to: canOpenFacturas ? buildDashboardFacturasLink('vencidas') : '',
        }),
        buildQueueItem({
          label: 'Cambios con motivo',
          value: workQueue.documentosRecientes.conMotivo,
          description: 'Actividad reciente con observaciones o justificaciones.',
          tone: 'warning',
        }),
        buildQueueItem({
          label: 'Tramites activos',
          value: workQueue.tramites.activos,
          description: 'Documentos ya fuera de contabilizacion que siguen vivos.',
          tone: 'secondary',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
      ];
    case DASHBOARD_PROFILES.GERENCIA:
      return [
        buildQueueItem({
          label: 'Riesgo vencido',
          value: workQueue.facturas.vencidas,
          description: 'Exposicion visible que conviene mirar antes de decidir.',
          tone: 'danger',
          to: canOpenFacturas ? buildDashboardFacturasLink('vencidas') : '',
        }),
        buildQueueItem({
          label: 'En tramite',
          value: workQueue.facturas.enTramite,
          description: 'Volumen actualmente avanzando por workflow.',
          tone: 'primary',
          to: canOpenFacturas ? buildDashboardFacturasLink('en_tramite') : '',
        }),
        buildQueueItem({
          label: 'Cambios con motivo',
          value: workQueue.documentosRecientes.conMotivo,
          description: 'Actualizaciones recientes que traen contexto para validar.',
          tone: 'warning',
        }),
      ];
    case DASHBOARD_PROFILES.ASISTENTE:
      return [
        buildQueueItem({
          label: 'Retenciones pendientes',
          value: workQueue.facturas.retencionesPendientes,
          description: 'Casos que conviene apoyar o escalar segun el flujo.',
          tone: 'info',
          to: canOpenRetenciones ? '/retenciones-pendientes' : '',
        }),
        buildQueueItem({
          label: 'Rechazos activos',
          value: workQueue.tramites.rechazadosActivos,
          description: 'Documentos observados donde hace falta contexto o seguimiento.',
          tone: 'danger',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
        buildQueueItem({
          label: 'Cambios con motivo',
          value: workQueue.documentosRecientes.conMotivo,
          description: 'Cambios recientes que ayudan a retomar el hilo del caso.',
          tone: 'secondary',
        }),
      ];
    case DASHBOARD_PROFILES.CONSULTA:
      return [
        buildQueueItem({
          label: 'Cambios con motivo',
          value: workQueue.documentosRecientes.conMotivo,
          description: 'Documentos recientes donde ya existe contexto escrito.',
          tone: 'warning',
        }),
        buildQueueItem({
          label: 'Actividad reciente',
          value: workQueue.documentosRecientes.total,
          description: 'Movimientos visibles en la muestra reciente.',
          tone: 'secondary',
        }),
        buildQueueItem({
          label: 'Sociedades visibles',
          value: workQueue.sociedades.visibles,
          description: 'Alcance actual de consulta dentro del tablero.',
          tone: 'info',
        }),
      ];
    default:
      return [
        buildQueueItem({
          label: 'Cambios recientes',
          value: workQueue.documentosRecientes.total,
          description: 'Actividad visible para seguimiento rapido.',
          tone: 'secondary',
        }),
        buildQueueItem({
          label: 'Rechazos activos',
          value: workQueue.tramites.rechazadosActivos,
          description: 'Casos observados que pueden requerir contexto adicional.',
          tone: 'danger',
          to: canOpenTramites ? buildDashboardTramitesLink() : '',
        }),
        buildQueueItem({
          label: 'Retenciones pendientes',
          value: workQueue.facturas.retencionesPendientes,
          description: 'Saldo retenido que conviene seguir de cerca.',
          tone: 'info',
          to: canOpenRetenciones ? '/retenciones-pendientes' : '',
        }),
      ];
  }
};

const buildFocusItems = ({
  dashboardProfile,
  stats,
  recentDocs,
  monedas,
  cuentasPorPagar,
  vencidas,
  porVencer7Dias,
  retencionesPendientes,
  topProveedoresPorPagar,
}) => {
  const pendientesBase = Number(stats.noContabilizado || 0) + Number(stats.enRevision || 0);

  switch (dashboardProfile) {
    case DASHBOARD_PROFILES.ADMIN:
      return [
        {
          label: 'Sociedades activas',
          value: stats.totalSociedades ?? 0,
          description: 'Sociedades con visibilidad en este dashboard.',
        },
        {
          label: 'Facturas del mes',
          value: stats.totalMes ?? 0,
          description: 'Entrada reciente para monitoreo del flujo.',
        },
        {
          label: 'Pendientes operativos',
          value: pendientesBase,
          description: 'No contabilizadas y en revision.',
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Cambios visibles para seguimiento rapido.',
        },
      ];
    case DASHBOARD_PROFILES.TESORERIA:
      return [
        {
          label: 'Cola de pago',
          value: cuentasPorPagar.documentos ?? 0,
          description: 'Documentos que ya entraron al flujo financiero.',
        },
        {
          label: 'Atencion inmediata',
          value: vencidas.documentos ?? 0,
          description: 'Facturas vencidas que requieren accion.',
        },
        {
          label: 'Proximos 7 dias',
          value: porVencer7Dias.documentos ?? 0,
          description: 'Casos para planificar caja y ejecucion.',
        },
        {
          label: 'Proveedores criticos',
          value: countTopProveedores(topProveedoresPorPagar),
          description: 'Ranking separado por moneda.',
        },
      ];
    case DASHBOARD_PROFILES.CONTABILIDAD:
      return [
        {
          label: 'Por contabilizar',
          value: stats.noContabilizado ?? 0,
          description: 'Documentos aun fuera del flujo de pago.',
        },
        {
          label: 'En revision',
          value: stats.enRevision ?? 0,
          description: 'Validaciones o correcciones pendientes.',
        },
        {
          label: 'Retenciones abiertas',
          value: retencionesPendientes.documentos ?? 0,
          description: 'Retenciones que conviene completar o revisar.',
        },
        {
          label: 'Monedas activas',
          value: monedas.length,
          description: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.',
        },
      ];
    case DASHBOARD_PROFILES.GERENCIA:
      return [
        {
          label: 'En flujo',
          value: stats.resumenEstados?.en_tramite ?? 0,
          description: 'Documentos avanzando en pagos y revisiones.',
        },
        {
          label: 'Pendientes base',
          value: pendientesBase,
          description: 'Casos que siguen en etapas iniciales.',
        },
        {
          label: 'Vencidas',
          value: vencidas.documentos ?? 0,
          description: 'Riesgo operativo que conviene revisar primero.',
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Movimiento reciente para validar contexto.',
        },
      ];
    case DASHBOARD_PROFILES.ASISTENTE:
      return [
        {
          label: 'Bandeja de apoyo',
          value: pendientesBase,
          description: 'Documentos para preparar, validar o seguir.',
        },
        {
          label: 'Cambios recientes',
          value: recentDocs.length,
          description: 'Ideal para retomar contexto rapido.',
        },
        {
          label: 'Vencimientos proximos',
          value: porVencer7Dias.documentos ?? 0,
          description: 'Casos que conviene escalar o priorizar.',
        },
        {
          label: 'Retenciones por revisar',
          value: retencionesPendientes.documentos ?? 0,
          description: 'Apoyo operativo antes del siguiente paso.',
        },
      ];
    case DASHBOARD_PROFILES.CONSULTA:
      return [
        {
          label: 'Documentos visibles',
          value: stats.totalFacturas ?? 0,
          description: 'Base documental disponible para consulta.',
        },
        {
          label: 'Pendientes observables',
          value: pendientesBase,
          description: 'Casos que vale la pena monitorear.',
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Cambios y movimientos recientes del sistema.',
        },
        {
          label: 'Monedas activas',
          value: monedas.length,
          description: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.',
        },
      ];
    default:
      return [
        {
          label: 'Pendientes',
          value: pendientesBase,
          description: 'Documentos pendientes de avanzar en el flujo.',
        },
        {
          label: 'Vencidas',
          value: vencidas.documentos ?? 0,
          description: 'Atencion inmediata por vencimiento.',
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Cambios recientes visibles en esta sociedad.',
        },
        {
          label: 'Monedas activas',
          value: monedas.length,
          description: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.',
        },
      ];
  }
};

const buildQuickActions = ({ userPermissions }) => {
  const { hasPermission, hasAnyPermission } = createPermissionHelpers(userPermissions);
  const items = [];

  if (hasPermission('documentos_ver')) {
    items.push({
      to: '/facturas',
      label: 'Facturas',
      description: 'Consultar documentos, estados y detalle de facturas.',
    });
    items.push({
      to: '/notas-credito',
      label: 'Notas de credito',
      description: 'Revisar notas y su impacto por moneda.',
    });
    items.push({
      to: '/tiquetes-electronicos',
      label: 'Tiquetes',
      description: 'Seguir comprobantes y movimientos recientes.',
    });
  }

  if (hasPermission('documentos_contabilizar')) {
    items.push({
      to: '/retenciones-pendientes',
      label: 'Retenciones',
      description: 'Ver pendientes contables y soporte de retencion.',
    });
  }

  if (
    hasPermission('documentos_ver')
    || hasAnyPermission([
      'documentos_tramitar_pago',
      'documentos_aprobar_gerencia',
      'documentos_aprobar_gerencia_contable',
      'documentos_aprobar_gerencia_financiera',
      'documentos_marcar_pagado',
    ])
  ) {
    items.push({
      to: '/tramites',
      label: 'Tramites',
      description: 'Dar seguimiento al flujo de pago y aprobaciones.',
    });
  }

  if (hasPermission('usuarios_administrar')) {
    items.push({
      to: '/usuarios',
      label: 'Usuarios',
      description: 'Administrar accesos, roles y sociedades.',
    });
  }

  return items.slice(0, 5);
};

const buildProfileNotes = ({
  dashboardProfile,
  roleName,
  selectedSociedadName,
  hasMultipleCurrencies,
}) => {
  const scopeLabel = selectedSociedadName || 'la sociedad seleccionada';
  const notes = [];

  if (dashboardProfile === DASHBOARD_PROFILES.CONSULTA) {
    notes.push(`Este panel esta pensado para seguimiento y consulta segura dentro de ${scopeLabel}.`);
    notes.push('Usa la actividad reciente para abrir documentos y revisar comentarios o historial antes de escalar.');
  } else if (dashboardProfile === DASHBOARD_PROFILES.ASISTENTE) {
    notes.push(`Este panel auxilia el trabajo diario de ${roleName || 'tu rol'} dentro de ${scopeLabel}.`);
    notes.push('Empieza por la bandeja de apoyo y luego entra a los modulos operativos desde los accesos rapidos.');
  } else if (dashboardProfile === DASHBOARD_PROFILES.ADMIN) {
    notes.push(`Tienes una vista transversal del sistema, con foco en ${scopeLabel} y salud operativa general.`);
    notes.push('Usa este tablero para detectar cuellos de botella y decidir donde intervenir primero.');
  } else {
    notes.push(`El tablero prioriza lo mas relevante para ${roleName || 'tu rol'} en ${scopeLabel}.`);
    notes.push('Usa los accesos rapidos para profundizar en cada modulo sin perder el contexto general.');
  }

  if (hasMultipleCurrencies) {
    notes.push('Recuerda que todos los montos se interpretan por moneda y nunca como un total consolidado entre divisas.');
  }

  return notes;
};

const buildBanner = ({ dashboardProfile, hasMultipleCurrencies }) => {
  if (hasMultipleCurrencies) {
    return {
      title: 'Modo multicurrency activo',
      copy: 'Los montos del dashboard se muestran separados por moneda y no se suman entre divisas.',
    };
  }

  if (dashboardProfile === DASHBOARD_PROFILES.CONSULTA) {
    return {
      title: 'Modo consulta activo',
      copy: 'Este panel prioriza seguimiento, trazabilidad y contexto rapido para usuarios de apoyo o consulta.',
    };
  }

  if (dashboardProfile === DASHBOARD_PROFILES.ASISTENTE) {
    return {
      title: 'Modo auxiliar activo',
      copy: 'El dashboard resalta prioridades del dia y accesos rapidos para apoyar la operacion.',
    };
  }

  return null;
};

const formatRoleLabel = (authUser) => (
  authUser?.rol_nombre || authUser?.rol_codigo || (authUser?.rol != null ? `Rol ${authUser.rol}` : 'Usuario')
);

const formatGreetingName = (authUser) => {
  const nombre = String(authUser?.nombre || 'usuario').trim();
  return nombre.split(/\s+/)[0] || 'usuario';
};

export const buildDashboardViewModel = ({
  stats = {},
  workQueue = {},
  recentDocs = [],
  authUser = null,
  userPermissions = [],
  selectedSociedadName = '',
} = {}) => {
  const safeStats = stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : {};
  const visibleRecentDocs = Array.isArray(recentDocs) ? recentDocs : [];
  const dashboardProfile = getDashboardProfile({
    roleCode: authUser?.rol_codigo,
    permissions: userPermissions,
  });
  const {
    canOpenFacturas,
    canOpenRetenciones,
    canOpenTramites,
  } = createPermissionHelpers(userPermissions);
  const profileCopy = getDashboardProfileCopy(dashboardProfile);
  const roleLabel = formatRoleLabel(authUser);
  const greetingName = formatGreetingName(authUser);
  const cuentasPorPagar = safeStats.cuentasPorPagar || {};
  const vencidas = safeStats.vencidas || {};
  const porVencer7Dias = safeStats.porVencer7Dias || {};
  const retencionesPendientes = safeStats.retencionesPendientes || {};
  const pagadas = safeStats.pagadas || {};
  const totalesPorMoneda = safeStats.totalesPorMoneda || {};
  const monedas = Object.keys(totalesPorMoneda);
  const hasMultipleCurrencies = monedas.length > 1;
  const noContabilizadasPorMoneda = buildNoContabilizadasBreakdown(totalesPorMoneda);
  const topProveedoresPorMoneda = Object.entries(safeStats.topProveedoresPorPagar || {});
  const normalizedWorkQueue = normalizeWorkQueue({
    workQueue,
    stats: safeStats,
    recentDocs: visibleRecentDocs,
  });
  const cards = buildMetricCards({
    dashboardProfile,
    stats: safeStats,
    recentDocs: visibleRecentDocs,
    monedas,
    cuentasPorPagar,
    vencidas,
    porVencer7Dias,
    retencionesPendientes,
    pagadas,
    noContabilizadasPorMoneda,
    canOpenFacturas,
  });
  const primaryQueueItems = buildPrimaryQueueItems({
    dashboardProfile,
    workQueue: normalizedWorkQueue,
    canOpenFacturas,
    canOpenTramites,
    canOpenRetenciones,
  });
  const secondaryAlerts = buildSecondaryAlerts({
    dashboardProfile,
    workQueue: normalizedWorkQueue,
    canOpenFacturas,
    canOpenTramites,
    canOpenRetenciones,
  });
  const focusItems = buildFocusItems({
    dashboardProfile,
    stats: safeStats,
    recentDocs: visibleRecentDocs,
    monedas,
    cuentasPorPagar,
    vencidas,
    porVencer7Dias,
    retencionesPendientes,
    topProveedoresPorPagar: safeStats.topProveedoresPorPagar || {},
  });
  const quickActions = buildQuickActions({ userPermissions });
  const profileNotes = buildProfileNotes({
    dashboardProfile,
    roleName: roleLabel,
    selectedSociedadName,
    hasMultipleCurrencies,
  });
  const banner = buildBanner({ dashboardProfile, hasMultipleCurrencies });

  return {
    banner,
    cards,
    dashboardProfile,
    focusItems,
    greetingName,
    monedas,
    primaryQueueItems,
    profileCopy,
    profileNotes,
    quickActions,
    roleLabel,
    secondaryAlerts,
    topProveedoresPorMoneda,
    totalesPorMoneda,
    visibleRecentDocs,
    visibleSociedadName: selectedSociedadName,
    workQueueUpdatedAt: normalizedWorkQueue.updatedAt,
  };
};
