import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels';
import { formatAmount } from '../../../utils/formatters';

function TotalRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between small mt-1">
      <span className="text-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ContaTotalsSummary({
  conta,
  totalFactura,
  rebajosAplicados,
  retencionTotal,
  totalPagoPrincipal,
  retencionPagada,
  retencionPendiente,
  totalPendienteGlobal
}) {
  return (
    <div className="col-12">
      <div className="border rounded px-3 py-2 bg-light">
        <div className="d-flex justify-content-between small">
          <span className="text-muted">{FACTURA_DETALLE_LABELS.contabilizacion.totalFactura}</span>
          <strong>{formatAmount(totalFactura)}</strong>
        </div>
        <TotalRow
          label={FACTURA_DETALLE_LABELS.contabilizacion.rebajosAplicados}
          value={formatAmount(rebajosAplicados)}
        />
        <TotalRow
          label={FACTURA_DETALLE_LABELS.contabilizacion.retencion}
          value={formatAmount(retencionTotal)}
        />
        <TotalRow
          label={FACTURA_DETALLE_LABELS.contabilizacion.totalPagoPrincipal}
          value={formatAmount(totalPagoPrincipal)}
        />
        <TotalRow
          label={FACTURA_DETALLE_LABELS.contabilizacion.retencionPagada}
          value={formatAmount(retencionPagada)}
        />
        <TotalRow
          label={FACTURA_DETALLE_LABELS.contabilizacion.retencionPendiente}
          value={formatAmount(retencionPendiente)}
        />
        <TotalRow
          label={FACTURA_DETALLE_LABELS.contabilizacion.totalPendienteGlobal}
          value={formatAmount(totalPendienteGlobal)}
        />
        <TotalRow
          label={FACTURA_DETALLE_LABELS.contabilizacion.estadoRetencion}
          value={conta.estado_retencion || 'pendiente'}
        />
      </div>
    </div>
  );
}

export default ContaTotalsSummary;
