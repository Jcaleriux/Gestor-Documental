import EmptyState from './common/EmptyState';
import SectionCard from './common/SectionCard';

function TramiteHistorial({ historial, historialError, labels }) {
  const headerLabels = labels || {
    title: 'Historial del tramite',
    empty: 'Sin historial.'
  };
  return (
    <SectionCard title={headerLabels.title} className="table-card">
      {historialError && <div className="text-danger mb-2">{historialError}</div>}
      {historial.length === 0 && !historialError && (
        <EmptyState className="py-2">{headerLabels.empty}</EmptyState>
      )}
      {historial.length > 0 && (
        <ul className="list-group">
          {historial.map((item) => (
            <li key={item.id} className="list-group-item">
              <div className="fw-semibold">{item.accion}</div>
              <div className="text-muted">
                {item.usuario || '-'} - {new Date(item.creado_en).toLocaleString()}
              </div>
              {(item.estado_anterior || item.estado_nuevo) && (
                <div className="mt-1">
                  {item.estado_anterior || '-'}
                  {' -> '}
                  {item.estado_nuevo || '-'}
                </div>
              )}
              {item.factura_id && (
                <div className="mt-1">
                  Documento: {item.consecutivo || item.clave || `#${item.factura_id}`}
                </div>
              )}
              {item.motivo && <div className="mt-1">{item.motivo}</div>}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default TramiteHistorial;
