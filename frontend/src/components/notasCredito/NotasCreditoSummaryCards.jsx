import { estadoLabelNotaCredito } from '../../utils/estadosNotaCredito.js';
import { NOTAS_CREDITO_LABELS } from '../../utils/uiLabels.js';
import {
  formatLabel,
  getSummaryByMoneda,
} from './notasCreditoPageHelpers.js';

function NotasCreditoSummaryCards({ meta, summary }) {
  return (
    <div className="facturas-summary-grid">
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.resultsSummary}</span>
        <strong className="facturas-summary-value">
          {formatLabel(NOTAS_CREDITO_LABELS.totalResults, { count: meta.totalItems })}
        </strong>
        <span className="facturas-summary-meta">
          {meta.totalPages > 0
            ? formatLabel(NOTAS_CREDITO_LABELS.pageSummary, { page: meta.page, totalPages: meta.totalPages })
            : 'Sin resultados'}
        </span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.totalFilteredLabel}</span>
        <strong className="facturas-summary-value">{getSummaryByMoneda(summary, 'totalAmount')}</strong>
        <span className="facturas-summary-meta">{NOTAS_CREDITO_LABELS.currenciesSummaryTitle}</span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.saldoDisponibleLabel}</span>
        <strong className="facturas-summary-value">{getSummaryByMoneda(summary, 'totalSaldoDisponible')}</strong>
        <span className="facturas-summary-meta">Disponible para aplicar</span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.statesSummaryTitle}</span>
        <div className="facturas-summary-chip-list">
          {(summary.byEstado || []).slice(0, 4).map((entry) => (
            <span key={entry.estado} className="facturas-summary-chip">
              {estadoLabelNotaCredito(entry.estado)}: {entry.totalItems}
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

export default NotasCreditoSummaryCards;
