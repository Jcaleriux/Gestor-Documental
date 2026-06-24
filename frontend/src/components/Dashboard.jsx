import { useDashboard } from '../hooks/useDashboard.js';
import { useDashboardViewModel } from '../hooks/dashboard/useDashboardViewModel.js';
import LoadingState from './common/LoadingState.jsx';
import DashboardMetricCard from './dashboard/DashboardMetricCard.jsx';
import DashboardRecentDocumentsSection from './dashboard/DashboardRecentDocumentsSection.jsx';
import DashboardProvidersSection from './dashboard/DashboardProvidersSection.jsx';
import DashboardCurrencyTotalsSection from './dashboard/DashboardCurrencyTotalsSection.jsx';
import DashboardStatusChartSection from './dashboard/DashboardStatusChartSection.jsx';
import { LOADING_LABELS } from '../utils/uiLabels.js';

function Dashboard({
  sociedadId,
  selectedSociedadName = '',
  authUser = null,
  userPermissions = [],
}) {
  const { stats, workQueue, recentDocs, loading, error, refetch } = useDashboard({ sociedadId });
  const {
    cards,
    currencySummary,
    statusDistribution,
    topProveedoresPorMoneda,
    visibleRecentDocs,
    visibleSociedadName,
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
          <div className="dashboard-eyebrow">Vista general</div>
          <h2 className="fw-bold mb-1">Dashboard</h2>
          <div className="text-muted">
            Resumen operativo comun para facturas y pagos.
            {visibleSociedadName ? ` Sociedad actual: ${visibleSociedadName}.` : ''}
          </div>
        </div>
        {visibleSociedadName && (
          <div className="dashboard-chip-list dashboard-hero-meta">
            <span className="dashboard-chip dashboard-chip-subtle">{visibleSociedadName}</span>
          </div>
        )}
      </div>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-12 col-md-6 col-xl-3" key={card.title}>
            <DashboardMetricCard card={card} />
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7 d-flex flex-column gap-3">
          <DashboardRecentDocumentsSection recentDocs={visibleRecentDocs} />
          <DashboardProvidersSection groups={topProveedoresPorMoneda} />
        </div>

        <div className="col-12 col-xl-5 d-flex flex-column gap-3">
          <DashboardCurrencyTotalsSection currencySummary={currencySummary} />
          <DashboardStatusChartSection items={statusDistribution} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
