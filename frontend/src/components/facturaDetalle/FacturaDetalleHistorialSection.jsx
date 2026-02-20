import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';

function FacturaDetalleHistorialSection({ estados }) {
  return (
    <SectionCard title={FACTURA_DETALLE_LABELS.historial.title} className="mb-3">
      {estados.length === 0 && <EmptyState className="py-2">{FACTURA_DETALLE_LABELS.historial.empty}</EmptyState>}
      <ul className="list-group">
        {estados.map((item) => (
          <li key={item.id} className="list-group-item">
            <div className="fw-semibold">{item.estado_nuevo}</div>
            <div className="text-muted">
              {item.usuario} - {new Date(item.creado_en).toLocaleString()}
            </div>
            {item.motivo && <div className="mt-1">{item.motivo}</div>}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export default FacturaDetalleHistorialSection;
