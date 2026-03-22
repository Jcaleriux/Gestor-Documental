import { Link } from 'react-router-dom';
import EmptyState from '../common/EmptyState.jsx';

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

export default DashboardQuickActions;
