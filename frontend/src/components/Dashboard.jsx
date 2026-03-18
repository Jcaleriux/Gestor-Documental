import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { formatAmount, formatRelativeTime, getMoneda } from '../utils/formatters';
import {
  DASHBOARD_PROFILES,
  getDashboardProfile,
  getDashboardProfileCopy
} from '../utils/dashboardProfiles';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import SectionCard from './common/SectionCard';
import { LOADING_LABELS } from '../utils/uiLabels';

const formatCurrencyAmount = (moneda, monto) => `${moneda} ${formatAmount(monto)}`;
const buildDashboardFacturasLink = (dashboardPreset) => {
  const params = new URLSearchParams({
    dashboardPreset,
    returnTo: '/',
    returnLabel: 'Dashboard'
  });

  return `/facturas?${params.toString()}`;
};

const buildNoContabilizadasBreakdown = (totalesPorMoneda) => (
  Object.entries(totalesPorMoneda || {})
    .map(([moneda, row]) => ({
      moneda,
      documentos: Number(row?.no_contabilizadas?.count || 0)
    }))
    .filter((entry) => entry.documentos > 0)
);

const countTopProveedores = (topProveedoresPorPagar) => (
  Object.values(topProveedoresPorPagar || {}).reduce(
    (total, proveedores) => total + (Array.isArray(proveedores) ? proveedores.length : 0),
    0
  )
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
  linkTo = ''
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
  linkTo
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
  canOpenFacturas = false
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
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('por_pagar') : ''
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
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('vencidas') : ''
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
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('por_vencer_7') : ''
    }),
    retencion: buildMetricCard({
      title: 'Retencion pendiente',
      value: retencionesPendientes.documentos ?? 0,
      breakdownLabel: 'Retencion por moneda',
      breakdownItems: retencionesPendientes.montosPorMoneda || [],
      breakdownType: 'amount',
      emptyLabel: 'Sin retenciones pendientes',
      tone: 'info',
      icon: 'RP'
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
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('pagadas') : ''
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
      linkTo: canOpenFacturas ? buildDashboardFacturasLink('no_contabilizadas') : ''
    }),
    enRevision: buildMetricCard({
      title: 'En revision',
      value: stats.enRevision ?? 0,
      summaryText: 'Documentos que requieren validacion o ajuste.',
      tone: 'warning',
      icon: 'ER'
    }),
    enTramite: buildMetricCard({
      title: 'En tramite',
      value: resumenEstados.en_tramite ?? 0,
      summaryText: 'Documentos avanzando en flujo de pago.',
      tone: 'primary',
      icon: 'ET'
    }),
    totalFacturas: buildMetricCard({
      title: 'Total documentos',
      value: stats.totalFacturas ?? 0,
      summaryText: `Ingresadas este mes: ${stats.totalMes ?? 0}`,
      tone: 'primary',
      icon: 'TD'
    }),
    recientes: buildMetricCard({
      title: 'Actualizaciones',
      value: recentDocs.length,
      summaryText: recentDocs.length > 0
        ? `${recentDocs.length} cambios recientes visibles en esta sociedad.`
        : 'Sin movimientos recientes.',
      tone: 'info',
      icon: 'AR'
    }),
    monedas: buildMetricCard({
      title: 'Monedas activas',
      value: monedas.length,
      summaryText: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.',
      tone: 'secondary',
      icon: 'MX'
    })
  };

  switch (dashboardProfile) {
    case DASHBOARD_PROFILES.ADMIN:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.pagadas,
        cards.noContabilizadas,
        cards.recientes,
        cards.monedas
      ];
    case DASHBOARD_PROFILES.TESORERIA:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.porVencer,
        cards.pagadas,
        cards.retencion,
        cards.noContabilizadas
      ];
    case DASHBOARD_PROFILES.CONTABILIDAD:
      return [
        cards.noContabilizadas,
        cards.enRevision,
        cards.retencion,
        cards.pagadas,
        cards.recientes,
        cards.monedas
      ];
    case DASHBOARD_PROFILES.GERENCIA:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.porVencer,
        cards.pagadas,
        cards.enTramite,
        cards.recientes
      ];
    case DASHBOARD_PROFILES.ASISTENTE:
      return [
        cards.noContabilizadas,
        cards.enRevision,
        cards.porVencer,
        cards.pagadas,
        cards.recientes,
        cards.monedas
      ];
    case DASHBOARD_PROFILES.CONSULTA:
      return [
        cards.totalFacturas,
        cards.noContabilizadas,
        cards.enTramite,
        cards.pagadas,
        cards.recientes,
        cards.monedas
      ];
    default:
      return [
        cards.totalPorPagar,
        cards.vencidas,
        cards.porVencer,
        cards.pagadas,
        cards.noContabilizadas,
        cards.recientes
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
  topProveedoresPorPagar
}) => {
  const pendientesBase = Number(stats.noContabilizado || 0) + Number(stats.enRevision || 0);

  switch (dashboardProfile) {
    case DASHBOARD_PROFILES.ADMIN:
      return [
        {
          label: 'Sociedades activas',
          value: stats.totalSociedades ?? 0,
          description: 'Sociedades con visibilidad en este dashboard.'
        },
        {
          label: 'Facturas del mes',
          value: stats.totalMes ?? 0,
          description: 'Entrada reciente para monitoreo del flujo.'
        },
        {
          label: 'Pendientes operativos',
          value: pendientesBase,
          description: 'No contabilizadas y en revision.'
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Cambios visibles para seguimiento rapido.'
        }
      ];
    case DASHBOARD_PROFILES.TESORERIA:
      return [
        {
          label: 'Cola de pago',
          value: cuentasPorPagar.documentos ?? 0,
          description: 'Documentos que ya entraron al flujo financiero.'
        },
        {
          label: 'Atencion inmediata',
          value: vencidas.documentos ?? 0,
          description: 'Facturas vencidas que requieren accion.'
        },
        {
          label: 'Proximos 7 dias',
          value: porVencer7Dias.documentos ?? 0,
          description: 'Casos para planificar caja y ejecucion.'
        },
        {
          label: 'Proveedores criticos',
          value: countTopProveedores(topProveedoresPorPagar),
          description: 'Ranking separado por moneda.'
        }
      ];
    case DASHBOARD_PROFILES.CONTABILIDAD:
      return [
        {
          label: 'Por contabilizar',
          value: stats.noContabilizado ?? 0,
          description: 'Documentos aun fuera del flujo de pago.'
        },
        {
          label: 'En revision',
          value: stats.enRevision ?? 0,
          description: 'Validaciones o correcciones pendientes.'
        },
        {
          label: 'Retenciones abiertas',
          value: retencionesPendientes.documentos ?? 0,
          description: 'Retenciones que conviene completar o revisar.'
        },
        {
          label: 'Monedas activas',
          value: monedas.length,
          description: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.'
        }
      ];
    case DASHBOARD_PROFILES.GERENCIA:
      return [
        {
          label: 'En flujo',
          value: stats.resumenEstados?.en_tramite ?? 0,
          description: 'Documentos avanzando en pagos y revisiones.'
        },
        {
          label: 'Pendientes base',
          value: pendientesBase,
          description: 'Casos que siguen en etapas iniciales.'
        },
        {
          label: 'Vencidas',
          value: vencidas.documentos ?? 0,
          description: 'Riesgo operativo que conviene revisar primero.'
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Movimiento reciente para validar contexto.'
        }
      ];
    case DASHBOARD_PROFILES.ASISTENTE:
      return [
        {
          label: 'Bandeja de apoyo',
          value: pendientesBase,
          description: 'Documentos para preparar, validar o seguir.'
        },
        {
          label: 'Cambios recientes',
          value: recentDocs.length,
          description: 'Ideal para retomar contexto rapido.'
        },
        {
          label: 'Vencimientos proximos',
          value: porVencer7Dias.documentos ?? 0,
          description: 'Casos que conviene escalar o priorizar.'
        },
        {
          label: 'Retenciones por revisar',
          value: retencionesPendientes.documentos ?? 0,
          description: 'Apoyo operativo antes del siguiente paso.'
        }
      ];
    case DASHBOARD_PROFILES.CONSULTA:
      return [
        {
          label: 'Documentos visibles',
          value: stats.totalFacturas ?? 0,
          description: 'Base documental disponible para consulta.'
        },
        {
          label: 'Pendientes observables',
          value: pendientesBase,
          description: 'Casos que vale la pena monitorear.'
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Cambios y movimientos recientes del sistema.'
        },
        {
          label: 'Monedas activas',
          value: monedas.length,
          description: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.'
        }
      ];
    default:
      return [
        {
          label: 'Pendientes',
          value: pendientesBase,
          description: 'Documentos pendientes de avanzar en el flujo.'
        },
        {
          label: 'Vencidas',
          value: vencidas.documentos ?? 0,
          description: 'Atencion inmediata por vencimiento.'
        },
        {
          label: 'Actividad reciente',
          value: recentDocs.length,
          description: 'Cambios recientes visibles en esta sociedad.'
        },
        {
          label: 'Monedas activas',
          value: monedas.length,
          description: monedas.length > 0 ? monedas.join(' / ') : 'Sin movimiento registrado.'
        }
      ];
  }
};

const buildQuickActions = ({ userPermissions }) => {
  const permissionSet = new Set(Array.isArray(userPermissions) ? userPermissions : []);
  const hasPermission = (permission) => permissionSet.has('acceso_total') || permissionSet.has(permission);
  const hasAnyPermission = (permissions) => permissions.some((permission) => hasPermission(permission));
  const items = [];

  if (hasPermission('documentos_ver')) {
    items.push({
      to: '/facturas',
      label: 'Facturas',
      description: 'Consultar documentos, estados y detalle de facturas.'
    });
    items.push({
      to: '/notas-credito',
      label: 'Notas de credito',
      description: 'Revisar notas y su impacto por moneda.'
    });
    items.push({
      to: '/tiquetes-electronicos',
      label: 'Tiquetes',
      description: 'Seguir comprobantes y movimientos recientes.'
    });
  }

  if (hasPermission('documentos_contabilizar')) {
    items.push({
      to: '/retenciones-pendientes',
      label: 'Retenciones',
      description: 'Ver pendientes contables y soporte de retencion.'
    });
  }

  if (
    hasPermission('documentos_ver')
    || hasAnyPermission([
      'documentos_tramitar_pago',
      'documentos_aprobar_gerencia',
      'documentos_aprobar_gerencia_contable',
      'documentos_aprobar_gerencia_financiera',
      'documentos_marcar_pagado'
    ])
  ) {
    items.push({
      to: '/tramites',
      label: 'Tramites',
      description: 'Dar seguimiento al flujo de pago y aprobaciones.'
    });
  }

  if (hasPermission('usuarios_administrar')) {
    items.push({
      to: '/usuarios',
      label: 'Usuarios',
      description: 'Administrar accesos, roles y sociedades.'
    });
  }

  return items.slice(0, 5);
};

const buildProfileNotes = ({ dashboardProfile, roleName, selectedSociedadName, hasMultipleCurrencies }) => {
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
      copy: 'Los montos del dashboard se muestran separados por moneda y no se suman entre divisas.'
    };
  }

  if (dashboardProfile === DASHBOARD_PROFILES.CONSULTA) {
    return {
      title: 'Modo consulta activo',
      copy: 'Este panel prioriza seguimiento, trazabilidad y contexto rapido para usuarios de apoyo o consulta.'
    };
  }

  if (dashboardProfile === DASHBOARD_PROFILES.ASISTENTE) {
    return {
      title: 'Modo auxiliar activo',
      copy: 'El dashboard resalta prioridades del dia y accesos rapidos para apoyar la operacion.'
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

function DashboardMetricBreakdown({
  label,
  items,
  type = 'amount',
  emptyLabel = 'Sin montos',
  summaryText = ''
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="stat-trend">{summaryText || emptyLabel}</div>;
  }

  return (
    <div className="stat-breakdown">
      <div className="stat-breakdown-label">{label}</div>
      <div className="dashboard-chip-list">
        {items.map((item) => (
          <span
            className="dashboard-chip"
            key={`${type}-${item.moneda}-${item.documentos ?? item.monto ?? 0}`}
          >
            {type === 'count'
              ? `${item.moneda} ${item.documentos}`
              : formatCurrencyAmount(item.moneda, item.monto)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardMetricCard({ card }) {
  const cardContent = (
    <div className={`card stat-card shadow-sm border-0 h-100${card.linkTo ? ' stat-card-clickable' : ''}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div className="w-100">
            <div className="stat-title">{card.title}</div>
            <div className="stat-value">{card.value}</div>
            <DashboardMetricBreakdown
              label={card.breakdownLabel}
              items={card.breakdownItems}
              type={card.breakdownType}
              emptyLabel={card.emptyLabel}
              summaryText={card.summaryText}
            />
          </div>
          <div className={`stat-icon bg-soft-${card.tone}`}>{card.icon}</div>
        </div>
        {card.linkTo ? (
          <div className="stat-card-hover-hint" aria-hidden="true">
            Ver facturas filtradas
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!card.linkTo) {
    return cardContent;
  }

  return (
    <Link
      className="stat-card-link"
      to={card.linkTo}
      aria-label={`${card.title}: abrir facturas filtradas`}
    >
      {cardContent}
    </Link>
  );
}

function DashboardFocusGrid({ items }) {
  return (
    <div className="dashboard-focus-grid">
      {items.map((item) => (
        <div className="dashboard-focus-card" key={item.label}>
          <div className="dashboard-focus-label">{item.label}</div>
          <div className="dashboard-focus-value">{item.value}</div>
          <div className="dashboard-focus-description">{item.description}</div>
        </div>
      ))}
    </div>
  );
}

function DashboardQuickActions({ items }) {
  if (items.length === 0) {
    return <EmptyState className="py-2">No hay accesos rapidos configurados para este perfil.</EmptyState>;
  }

  return (
    <div className="dashboard-action-list">
      {items.map((item) => (
        <Link className="dashboard-action-item" key={item.to} to={item.to}>
          <div className="dashboard-action-label">{item.label}</div>
          <div className="dashboard-action-description">{item.description}</div>
        </Link>
      ))}
    </div>
  );
}

function DashboardNotes({ notes }) {
  return (
    <div className="dashboard-note-list">
      {notes.map((note) => (
        <div className="dashboard-note-item" key={note}>{note}</div>
      ))}
    </div>
  );
}

function Dashboard({
  sociedadId,
  selectedSociedadName = '',
  authUser = null,
  userPermissions = []
}) {
  const { stats, recentDocs, loading } = useDashboard({ sociedadId });

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver el dashboard.</p>;
  }

  if (loading) return <LoadingState label={LOADING_LABELS.dashboard} />;

  const dashboardProfile = getDashboardProfile({
    roleCode: authUser?.rol_codigo,
    permissions: userPermissions
  });
  const permissionSet = new Set(Array.isArray(userPermissions) ? userPermissions : []);
  const canOpenFacturas = permissionSet.has('acceso_total') || permissionSet.has('documentos_ver');
  const profileCopy = getDashboardProfileCopy(dashboardProfile);
  const roleLabel = formatRoleLabel(authUser);
  const greetingName = formatGreetingName(authUser);
  const cuentasPorPagar = stats.cuentasPorPagar || {};
  const vencidas = stats.vencidas || {};
  const porVencer7Dias = stats.porVencer7Dias || {};
  const retencionesPendientes = stats.retencionesPendientes || {};
  const pagadas = stats.pagadas || {};
  const totalesPorMoneda = stats.totalesPorMoneda || {};
  const monedas = Object.keys(totalesPorMoneda);
  const hasMultipleCurrencies = monedas.length > 1;
  const noContabilizadasPorMoneda = buildNoContabilizadasBreakdown(totalesPorMoneda);
  const topProveedoresPorMoneda = Object.entries(stats.topProveedoresPorPagar || {});
  const cards = buildMetricCards({
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
    canOpenFacturas
  });
  const focusItems = buildFocusItems({
    dashboardProfile,
    stats,
    recentDocs,
    monedas,
    cuentasPorPagar,
    vencidas,
    porVencer7Dias,
    retencionesPendientes,
    topProveedoresPorPagar: stats.topProveedoresPorPagar || {}
  });
  const quickActions = buildQuickActions({ userPermissions });
  const profileNotes = buildProfileNotes({
    dashboardProfile,
    roleName: roleLabel,
    selectedSociedadName,
    hasMultipleCurrencies
  });
  const banner = buildBanner({ dashboardProfile, hasMultipleCurrencies });

  return (
    <div className="container-fluid">
      <div className="dashboard-hero mb-4">
        <div>
          <div className="dashboard-eyebrow">{profileCopy.eyebrow}</div>
          <h2 className="fw-bold mb-1">Bienvenido, {greetingName}!</h2>
          <div className="text-muted">
            {profileCopy.subtitle}
            {selectedSociedadName ? ` Sociedad actual: ${selectedSociedadName}.` : ''}
          </div>
        </div>
        <div className="dashboard-chip-list dashboard-hero-meta">
          <span className="dashboard-chip dashboard-chip-subtle">{roleLabel}</span>
          {selectedSociedadName && (
            <span className="dashboard-chip dashboard-chip-subtle">{selectedSociedadName}</span>
          )}
        </div>
      </div>

      {banner && (
        <div className="dashboard-alert mb-4" role="status">
          <div className="dashboard-alert-title">{banner.title}</div>
          <div className="dashboard-alert-copy">{banner.copy}</div>
        </div>
      )}

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-12 col-md-6 col-xl-4" key={card.title}>
            <DashboardMetricCard card={card} />
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-7">
          <SectionCard title={profileCopy.focusTitle} className="section-card">
            <DashboardFocusGrid items={focusItems} />
          </SectionCard>
        </div>

        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          <SectionCard title="Accesos rapidos" className="section-card">
            <DashboardQuickActions items={quickActions} />
          </SectionCard>

          <SectionCard title={profileCopy.modeTitle} className="section-card">
            <DashboardNotes notes={profileNotes} />
          </SectionCard>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <SectionCard title="Documentos recientemente actualizados" className="section-card">
            <div className="activity-list">
              {recentDocs.length === 0 && (
                <EmptyState className="py-2">Sin actualizaciones recientes.</EmptyState>
              )}
              {recentDocs.map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="dot bg-primary" />
                  <div>
                    <div className="activity-text">
                      <Link to={`/facturas/${item.factura_id}`} className="text-decoration-none">
                        Documento #{item.consecutivo || item.clave || item.factura_id}
                      </Link>
                      {' - '}
                      {item.estado_anterior || 'sin estado'}
                      {' -> '}
                      {item.estado_nuevo}
                    </div>
                    <div className="activity-meta">
                      {item.usuario || 'sistema'} - {formatRelativeTime(item.creado_en)}
                    </div>
                    <div className="dashboard-chip-list mt-2">
                      <span className="dashboard-chip dashboard-chip-subtle">
                        {getMoneda(item)}
                      </span>
                    </div>
                    {item.motivo && <div className="text-muted small mt-2">{item.motivo}</div>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          <SectionCard title="Top proveedores por pagar" className="section-card">
            {topProveedoresPorMoneda.length === 0 && (
              <EmptyState className="py-2">Sin proveedores pendientes.</EmptyState>
            )}
            {topProveedoresPorMoneda.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {topProveedoresPorMoneda.map(([moneda, proveedores]) => (
                  <div className="dashboard-provider-group" key={moneda}>
                    <div className="dashboard-subsection-title">{moneda}</div>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Proveedor</th>
                            <th>Docs</th>
                            <th>Pago principal</th>
                            <th>Retencion pendiente</th>
                            <th>Pendiente global</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proveedores.map((proveedor) => (
                            <tr key={`${moneda}-${proveedor.proveedorId}`}>
                              <td>
                                <div className="fw-semibold">{proveedor.proveedorNombre}</div>
                                <div className="text-muted small">
                                  {proveedor.proveedorIdentificacion || 'Sin identificacion'}
                                </div>
                              </td>
                              <td>{proveedor.documentos}</td>
                              <td>{formatCurrencyAmount(moneda, proveedor.totalAPagar)}</td>
                              <td>{formatCurrencyAmount(moneda, proveedor.totalRetencionPendiente)}</td>
                              <td>{formatCurrencyAmount(moneda, proveedor.totalPendienteGlobal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Totales por moneda (neto a pagar)" className="section-card">
            {monedas.length === 0 && <EmptyState className="py-2">Sin datos de montos.</EmptyState>}
            {monedas.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Moneda</th>
                      <th>No contabilizadas</th>
                      <th>Contabilizadas</th>
                      <th>En tramite</th>
                      <th>Pagadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monedas.map((moneda) => {
                      const row = totalesPorMoneda[moneda] || {};
                      const noConta = row.no_contabilizadas || { count: 0, total: 0 };
                      const conta = row.contabilizadas || { count: 0, total: 0 };
                      const enTramite = row.en_tramite || { count: 0, total: 0 };
                      const pagadas = row.pagadas || { count: 0, total: 0 };
                      return (
                        <tr key={moneda}>
                          <td className="fw-semibold">{moneda}</td>
                          <td>
                            {noConta.count} / {formatCurrencyAmount(moneda, noConta.total)}
                          </td>
                          <td>
                            {conta.count} / {formatCurrencyAmount(moneda, conta.total)}
                          </td>
                          <td>
                            {enTramite.count} / {formatCurrencyAmount(moneda, enTramite.total)}
                          </td>
                          <td>
                            {pagadas.count} / {formatCurrencyAmount(moneda, pagadas.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
