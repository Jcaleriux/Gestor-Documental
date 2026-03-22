import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/formatters.js';
import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';

function DashboardWorkQueueSection({
  title = 'Cola de trabajo',
  items = [],
  updatedAt = '',
}) {
  const actions = updatedAt ? (
    <span className="text-muted small">Actualizado {formatRelativeTime(updatedAt)}</span>
  ) : null;

  return (
    <SectionCard title={title} actions={actions} className="section-card">
      {items.length === 0 ? (
        <EmptyState className="py-2">Sin cola operativa visible para este perfil.</EmptyState>
      ) : (
        <div className="dashboard-work-queue-grid">
          {items.map((item) => {
            const content = (
              <>
                <div className="dashboard-work-queue-header">
                  <span className={`dashboard-status-dot tone-${item.tone || 'primary'}`} aria-hidden="true" />
                  <span className="dashboard-work-queue-label">{item.label}</span>
                </div>
                <div className="dashboard-work-queue-value">{item.value}</div>
                <div className="dashboard-work-queue-description">{item.description}</div>
                {item.to ? (
                  <div className="dashboard-work-queue-link-hint">Abrir vista</div>
                ) : null}
              </>
            );

            if (!item.to) {
              return (
                <div className="dashboard-work-queue-card" key={item.label}>
                  {content}
                </div>
              );
            }

            return (
              <Link className="dashboard-work-queue-card dashboard-work-queue-link" key={item.label} to={item.to}>
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

export default DashboardWorkQueueSection;
