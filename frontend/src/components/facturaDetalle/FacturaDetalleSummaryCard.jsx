import SectionCard from '../common/SectionCard';
import StatusBadge from '../common/StatusBadge';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';
import { formatAmount, formatDate } from '../../utils/formatters';
import { estadoClassFactura, estadoLabelFactura } from '../../utils/estadosFactura';

function SummaryItem({ label, value }) {
  return (
    <div className="factura-summary-item">
      <div className="factura-summary-label">{label}</div>
      <div className="factura-summary-value">{value || '-'}</div>
    </div>
  );
}

function FacturaDetalleSummaryCard({ viewModel }) {
  const {
    factura,
    monedaFactura,
    canEditContabilizacion
  } = viewModel;

  const documentoPrincipal = factura.consecutivo || factura.numero_consecutivo || `Factura #${factura.id}`;
  const emisor = factura.emisor?.Nombre || factura.emisor?.nombre || '-';
  const total = formatAmount(factura.resumen?.TotalComprobante || 0);

  return (
    <SectionCard
      title={FACTURA_DETALLE_LABELS.summary.title}
      className="mb-3 factura-summary-card"
      actions={(
        <div className="d-flex flex-wrap gap-2">
          <StatusBadge
            label={estadoLabelFactura(factura.estado)}
            className={estadoClassFactura(factura.estado)}
          />
          <StatusBadge
            label={canEditContabilizacion
              ? FACTURA_DETALLE_LABELS.header.modeEditable
              : FACTURA_DETALLE_LABELS.header.modeReadOnly}
            className={canEditContabilizacion ? 'badge-soft-success' : 'badge-soft-secondary'}
          />
        </div>
      )}
    >
      <div className="factura-summary-grid">
        <SummaryItem label={FACTURA_DETALLE_LABELS.summary.documento} value={`Factura #${documentoPrincipal}`} />
        <SummaryItem label={FACTURA_DETALLE_LABELS.summary.emisor} value={emisor} />
        <SummaryItem label={FACTURA_DETALLE_LABELS.summary.fechaEmision} value={formatDate(factura.fecha_emision)} />
        <SummaryItem label={FACTURA_DETALLE_LABELS.summary.total} value={`${monedaFactura} ${total}`} />
      </div>
    </SectionCard>
  );
}

export default FacturaDetalleSummaryCard;
