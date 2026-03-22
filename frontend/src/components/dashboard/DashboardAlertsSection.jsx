import { Link } from 'react-router-dom';
import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';

function DashboardAlertsSection({
  title = 'Alertas y focos',
  items = [],
}) {
  return (
    <SectionCard title={title} className="section-card">
      {items.length === 0 ? (
        <EmptyState className="py-2">Sin alertas operativas para este perfil.</EmptyState>
      ) : (
        <div className="dashboard-alert-list">
          {items.map((item) => {
            const content = (
              <>
                <div className="dashboard-alert-item-header">
                  <span className={`dashboard-status-dot tone-${item.tone || 'primary'}`} aria-hidden="true" />
                  <span className="dashboard-alert-item-label">{item.label}</span>
                  <span className="dashboard-alert-item-value">{item.value}</span>
                </div>
                <div className="dashboard-alert-item-description">{item.description}</div>
              </>
            );

            if (!item.to) {
              return (
                <div className="dashboard-alert-item" key={item.label}>
                  {content}
                </div>
              );
            }

            return (
              <Link className="dashboard-alert-item dashboard-alert-item-link" key={item.label} to={item.to}>
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

export default DashboardAlertsSection;
