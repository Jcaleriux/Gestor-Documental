import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';
import { formatAmount, formatDateTime } from '../../utils/formatters';

const CATEGORY_LABELS = Object.freeze({
  estado: 'Estado',
  aprobacion: 'Aprobación',
  tesoreria: 'Tesorería',
  tramite: 'Trámite',
  pago: 'Pago',
  retencion: 'Retención'
});

const formatHistorialDateTime = (value) => {
  if (!value) {
    return 'Sin fecha';
  }

  const formatted = formatDateTime(value);
  return formatted === '-' ? 'Sin fecha' : formatted;
};

const formatMonto = (moneda, monto) => {
  if (!Number.isFinite(Number(monto))) {
    return '';
  }

  return `${moneda || ''} ${formatAmount(monto)}`.trim();
};

function FacturaDetalleHistorialSection({ viewModel }) {
  const { estados } = viewModel;

  return (
    <SectionCard title={FACTURA_DETALLE_LABELS.historial.title} className="mb-3">
      {estados.length === 0 && <EmptyState className="py-2">{FACTURA_DETALLE_LABELS.historial.empty}</EmptyState>}
      <div className="factura-timeline-list">
        {estados.map((item) => (
          <article key={item.id} className="factura-timeline-item">
            <div className="factura-timeline-head">
              <div className="factura-timeline-copy">
                <div className="factura-timeline-title">{item.titulo || item.estado_nuevo || '-'}</div>
                <div className="factura-timeline-meta">
                  <span className="factura-timeline-meta-item">{formatHistorialDateTime(item.creado_en)}</span>
                  {item.usuario && <span className="factura-timeline-meta-item">{item.usuario}</span>}
                  {item.referencia && <span className="factura-timeline-meta-item">{item.referencia}</span>}
                </div>
              </div>
              {item.categoria && (
                <span className={`factura-timeline-badge categoria-${item.categoria}`}>
                  {CATEGORY_LABELS[item.categoria] || item.categoria}
                </span>
              )}
            </div>

            {item.descripcion && item.descripcion !== item.usuario && (
              <div className="factura-timeline-description">{item.descripcion}</div>
            )}

            {formatMonto(item.moneda, item.monto) && (
              <div className="factura-timeline-amount">{formatMonto(item.moneda, item.monto)}</div>
            )}

            {item.motivo && (
              <div className="factura-timeline-motivo">
                <span className="fw-semibold">Motivo:</span> {item.motivo}
              </div>
            )}
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export default FacturaDetalleHistorialSection;
