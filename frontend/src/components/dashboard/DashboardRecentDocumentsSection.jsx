import { Link } from 'react-router-dom';
import {
  formatRelativeTime,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
  getMoneda,
} from '../../utils/formatters.js';
import { estadoClassFactura, estadoLabelFactura } from '../../utils/estadosFactura.js';
import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';
import StatusBadge from '../common/StatusBadge.jsx';

const getRecentActionLabel = (item) => {
  const from = String(item?.estado_anterior || '').trim();
  const to = String(item?.estado_nuevo || '').trim();
  const motivo = String(item?.motivo || '').trim();

  if (from && to) {
    return {
      from: estadoLabelFactura(from),
      fromClassName: estadoClassFactura(from),
      to: estadoLabelFactura(to),
      toClassName: estadoClassFactura(to),
    };
  }

  if (to) {
    return {
      to: estadoLabelFactura(to),
      toClassName: estadoClassFactura(to),
    };
  }

  if (motivo) {
    return { text: motivo };
  }

  return { text: 'Actualizada' };
};

function DashboardRecentDocumentsSection({ recentDocs }) {
  return (
    <SectionCard title="Actividad reciente" className="section-card">
      <div className="activity-list">
        {recentDocs.length === 0 && (
          <EmptyState className="py-2">Sin actualizaciones recientes.</EmptyState>
        )}
        {recentDocs.map((item) => {
          const facturaNumber = getDocumentoConsecutivo(item, String(item?.factura_id || '-'));
          const facturaNumberCompleto = getDocumentoConsecutivoCompleto(item, String(item?.factura_id || ''));
          const action = getRecentActionLabel(item);

          return (
            <div className="activity-item" key={item.id}>
              <span className="dot bg-primary" />
              <div>
                <div className="activity-text">
                  <Link to={`/facturas/${item.factura_id}`} className="text-decoration-none" title={facturaNumberCompleto}>
                    Factura #{facturaNumber}
                  </Link>
                  {action.text && <span className="activity-action-text"> {action.text}</span>}
                </div>
                {(action.from || action.to) && (
                  <div className="activity-state-change">
                    {action.from && <StatusBadge label={action.from} className={action.fromClassName} />}
                    {action.from && action.to && <span className="activity-state-arrow">→</span>}
                    {action.to && <StatusBadge label={action.to} className={action.toClassName} />}
                  </div>
                )}
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
