import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';

function FacturaDetalleSummaryCard({ factura, monedaFactura }) {
  return (
    <SectionCard title={FACTURA_DETALLE_LABELS.summary.title}>
      <div className="row g-2">
        <div className="col-6">
          <div className="text-muted">{FACTURA_DETALLE_LABELS.summary.consecutivo}</div>
          <div>{factura.consecutivo || factura.numero_consecutivo || '-'}</div>
        </div>
        <div className="col-6">
          <div className="text-muted">{FACTURA_DETALLE_LABELS.summary.estado}</div>
          <div>{factura.estado || 'no_contabilizado'}</div>
        </div>
        <div className="col-6">
          <div className="text-muted">{FACTURA_DETALLE_LABELS.summary.emisor}</div>
          <div>{factura.emisor?.Nombre || factura.emisor?.nombre || '-'}</div>
        </div>
        <div className="col-6">
          <div className="text-muted">Moneda</div>
          <div>{monedaFactura}</div>
        </div>
        <div className="col-6">
          <div className="text-muted">{FACTURA_DETALLE_LABELS.summary.fechaEmision}</div>
          <div>{factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString() : '-'}</div>
        </div>
        <div className="col-6">
          <div className="text-muted">{FACTURA_DETALLE_LABELS.summary.total}</div>
          <div>{factura.resumen?.TotalComprobante || 0}</div>
        </div>
      </div>
    </SectionCard>
  );
}

export default FacturaDetalleSummaryCard;
