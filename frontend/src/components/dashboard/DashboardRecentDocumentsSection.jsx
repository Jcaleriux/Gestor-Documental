import { Link } from 'react-router-dom';
import { formatRelativeTime, getMoneda } from '../../utils/formatters.js';
import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';

function DashboardRecentDocumentsSection({ recentDocs }) {
  return (
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
  );
}

export default DashboardRecentDocumentsSection;
