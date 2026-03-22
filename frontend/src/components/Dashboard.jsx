import { useDashboard } from '../hooks/useDashboard.js';
import { useDashboardViewModel } from '../hooks/dashboard/useDashboardViewModel.js';
import LoadingState from './common/LoadingState.jsx';
import SectionCard from './common/SectionCard.jsx';
import DashboardMetricCard from './dashboard/DashboardMetricCard.jsx';
import DashboardFocusGrid from './dashboard/DashboardFocusGrid.jsx';
import DashboardQuickActions from './dashboard/DashboardQuickActions.jsx';
import DashboardNotes from './dashboard/DashboardNotes.jsx';
import DashboardWorkQueueSection from './dashboard/DashboardWorkQueueSection.jsx';
import DashboardAlertsSection from './dashboard/DashboardAlertsSection.jsx';
import DashboardRecentDocumentsSection from './dashboard/DashboardRecentDocumentsSection.jsx';
import DashboardProvidersSection from './dashboard/DashboardProvidersSection.jsx';
import DashboardCurrencyTotalsSection from './dashboard/DashboardCurrencyTotalsSection.jsx';
import { LOADING_LABELS } from '../utils/uiLabels.js';

function Dashboard({
  sociedadId,
  selectedSociedadName = '',
  authUser = null,
  userPermissions = [],
}) {
  const { stats, workQueue, recentDocs, loading, error, refetch } = useDashboard({ sociedadId });
  const {
    banner,
    cards,
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
    visibleSociedadName,
    workQueueUpdatedAt,
  } = useDashboardViewModel({
    stats,
    workQueue,
    recentDocs,
    authUser,
    userPermissions,
    selectedSociedadName,
  });

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver el dashboard.</p>;
  }

  if (loading) {
    return <LoadingState label={LOADING_LABELS.dashboard} />;
  }

  return (
    <div className="container-fluid">
      {error && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      <div className="dashboard-hero mb-4">
        <div>
          <div className="dashboard-eyebrow">{profileCopy.eyebrow}</div>
          <h2 className="fw-bold mb-1">Bienvenido, {greetingName}!</h2>
          <div className="text-muted">
            {profileCopy.subtitle}
            {visibleSociedadName ? ` Sociedad actual: ${visibleSociedadName}.` : ''}
          </div>
        </div>
        <div className="dashboard-chip-list dashboard-hero-meta">
          <span className="dashboard-chip dashboard-chip-subtle">{roleLabel}</span>
          {visibleSociedadName && (
            <span className="dashboard-chip dashboard-chip-subtle">{visibleSociedadName}</span>
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
        <div className="col-12 col-xl-8">
          <DashboardWorkQueueSection
            title={profileCopy.focusTitle}
            items={primaryQueueItems}
            updatedAt={workQueueUpdatedAt}
          />
        </div>

        <div className="col-12 col-xl-4 d-flex flex-column gap-3">
          <DashboardAlertsSection items={secondaryAlerts} />

          <SectionCard title="Accesos rapidos" className="section-card">
            <DashboardQuickActions items={quickActions} />
          </SectionCard>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-12 col-md-6 col-xl-4" key={card.title}>
            <DashboardMetricCard card={card} />
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-7">
          <DashboardRecentDocumentsSection recentDocs={visibleRecentDocs} />
        </div>

        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          <SectionCard title={profileCopy.modeTitle} className="section-card">
            <DashboardNotes notes={profileNotes} />
          </SectionCard>

          <SectionCard title="Radar complementario" className="section-card">
            <DashboardFocusGrid items={focusItems} />
          </SectionCard>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <DashboardProvidersSection groups={topProveedoresPorMoneda} />
        </div>

        <div className="col-12 col-lg-5">
          <DashboardCurrencyTotalsSection monedas={monedas} totalesPorMoneda={totalesPorMoneda} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
