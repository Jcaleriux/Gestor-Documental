import { useDashboard } from '../hooks/useDashboard.js';
import { useDashboardViewModel } from '../hooks/dashboard/useDashboardViewModel.js';
import LoadingState from './common/LoadingState.jsx';
import SectionCard from './common/SectionCard.jsx';
import DashboardMetricCard from './dashboard/DashboardMetricCard.jsx';
import DashboardFocusGrid from './dashboard/DashboardFocusGrid.jsx';
import DashboardQuickActions from './dashboard/DashboardQuickActions.jsx';
import DashboardNotes from './dashboard/DashboardNotes.jsx';
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
  const { stats, recentDocs, loading, error, refetch } = useDashboard({ sociedadId });
  const {
    banner,
    cards,
    focusItems,
    greetingName,
    monedas,
    profileCopy,
    profileNotes,
    roleLabel,
    topProveedoresPorMoneda,
    totalesPorMoneda,
    visibleRecentDocs,
    visibleSociedadName,
    quickActions,
  } = useDashboardViewModel({
    stats,
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
          <DashboardRecentDocumentsSection recentDocs={visibleRecentDocs} />
        </div>

        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          <DashboardProvidersSection groups={topProveedoresPorMoneda} />
          <DashboardCurrencyTotalsSection monedas={monedas} totalesPorMoneda={totalesPorMoneda} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
