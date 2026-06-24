import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';

function DashboardStatusChartSection({ items }) {
  const hasItems = Array.isArray(items) && items.some((item) => item.value > 0);

  return (
    <SectionCard title="Facturas por estado" className="section-card">
      {!hasItems && <EmptyState className="py-2">Sin datos por estado.</EmptyState>}
      {hasItems && (
        <div className="dashboard-status-chart">
          {items.map((item) => (
            <div className="dashboard-status-chart-row" key={item.key}>
              <div className="dashboard-status-chart-label">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="dashboard-status-chart-track">
                <div
                  className={`dashboard-status-chart-bar tone-${item.tone}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default DashboardStatusChartSection;
