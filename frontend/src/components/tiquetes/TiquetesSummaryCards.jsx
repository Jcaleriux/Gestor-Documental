import { TIQUETES_ELECTRONICOS_LABELS } from '../../utils/uiLabels.js';
import {
  formatLabel,
  getSummaryByMoneda,
} from './tiquetesPageHelpers.js';

function TiquetesSummaryCards({ meta, summary }) {
  return (
    <div className="facturas-summary-grid tiquetes-summary-grid">
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{TIQUETES_ELECTRONICOS_LABELS.resultsSummary}</span>
        <strong className="facturas-summary-value">
          {formatLabel(TIQUETES_ELECTRONICOS_LABELS.totalResults, { count: meta.totalItems })}
        </strong>
        <span className="facturas-summary-meta">
          {meta.totalPages > 0
            ? formatLabel(TIQUETES_ELECTRONICOS_LABELS.pageSummary, { page: meta.page, totalPages: meta.totalPages })
            : 'Sin resultados'}
        </span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{TIQUETES_ELECTRONICOS_LABELS.totalFilteredLabel}</span>
        <strong className="facturas-summary-value">{getSummaryByMoneda(summary)}</strong>
        <span className="facturas-summary-meta">{TIQUETES_ELECTRONICOS_LABELS.currenciesSummaryTitle}</span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{TIQUETES_ELECTRONICOS_LABELS.currenciesSummaryTitle}</span>
        <div className="facturas-summary-chip-list">
          {(summary.byMoneda || []).slice(0, 4).map((entry) => (
            <span key={entry.moneda} className="facturas-summary-chip">
              {entry.moneda}: {entry.totalItems}
            </span>
          ))}
          {(summary.byMoneda || []).length === 0 ? (
            <span className="facturas-summary-meta">Sin datos</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default TiquetesSummaryCards;
