import { estadoLabelFactura } from '../../utils/estadosFactura.js';
import { FACTURAS_LABELS } from '../../utils/uiLabels.js';
import {
  formatLabel,
  getFacturasSummaryTotal,
} from './facturasPageHelpers.js';

function FacturasSummaryCards({ meta, summary }) {
  return (
    <div className="facturas-summary-grid">
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{FACTURAS_LABELS.resultsSummary}</span>
        <strong className="facturas-summary-value">
          {formatLabel(FACTURAS_LABELS.totalResults, { count: meta.totalItems })}
        </strong>
        <span className="facturas-summary-meta">
          {meta.totalPages > 0
            ? formatLabel(FACTURAS_LABELS.pageSummary, { page: meta.page, totalPages: meta.totalPages })
            : 'Sin resultados'}
        </span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{FACTURAS_LABELS.totalFilteredLabel}</span>
        <strong className="facturas-summary-value">{getFacturasSummaryTotal(summary)}</strong>
        <span className="facturas-summary-meta">{FACTURAS_LABELS.currenciesSummaryTitle}</span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{FACTURAS_LABELS.statesSummaryTitle}</span>
        <div className="facturas-summary-chip-list">
          {(summary.byEstado || []).slice(0, 4).map((entry) => (
            <span key={entry.estado} className="facturas-summary-chip">
              {estadoLabelFactura(entry.estado)}: {entry.totalItems}
            </span>
          ))}
          {(summary.byEstado || []).length === 0 ? (
            <span className="facturas-summary-meta">Sin datos</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default FacturasSummaryCards;
