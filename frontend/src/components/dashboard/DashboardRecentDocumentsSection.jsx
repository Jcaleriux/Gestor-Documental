import { Link } from 'react-router-dom';
import {
  formatRelativeTime,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
  getMoneda,
} from '../../utils/formatters.js';
import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';

const getRecentActionLabel = (item) => {
  const from = String(item?.estado_anterior || '').trim();
  const to = String(item?.estado_nuevo || '').trim();
  const motivo = String(item?.motivo || '').trim();

  if (from && to) {
    return `${from} -> ${to}`;
  }

  if (to) {
    return to;
  }

  if (motivo) {
    return motivo;
  }

  return 'Actualizada';
};

function DashboardRecentDocumentsSection({ recentDocs }) {
  return (
    <SectionCard title="Facturas recientemente actualizadas" className="section-card">
      <div className="activity-list">
        {recentDocs.length === 0 && (
          <EmptyState className="py-2">Sin actualizaciones recientes.</EmptyState>
        )}
        {recentDocs.map((item) => {
          const facturaNumber = getDocumentoConsecutivo(item, String(item?.factura_id || '-'));
          const facturaNumberCompleto = getDocumentoConsecutivoCompleto(item, String(item?.factura_id || ''));

          return (
            <div className="activity-item" key={item.id}>
              <span className="dot bg-primary" />
              <div>
                <div className="activity-text">
                  <Link to={`/facturas/${item.factura_id}`} className="text-decoration-none" title={facturaNumberCompleto}>
                    Factura #{facturaNumber}
                  </Link>
                  {' - '}
                  {getRecentActionLabel(item)}
                </div>
                <div className="activity-meta">
                  {(item.usuario || 'sistema')} - {formatRelativeTime(item.creado_en)} - {getMoneda(item)}
                </div>
                {item.motivo && <div className="text-muted small mt-2">{item.motivo}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

export default DashboardRecentDocumentsSection;
