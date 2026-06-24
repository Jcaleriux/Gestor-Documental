import { Link } from 'react-router-dom';
import { formatCurrencyAmount } from './dashboardViewModel.js';

function DashboardMetricBreakdown({
  label,
  items,
  type = 'amount',
  emptyLabel = 'Sin montos',
  summaryText = '',
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="stat-trend">{summaryText || emptyLabel}</div>;
  }

  return (
    <div className="stat-breakdown">
      <div className="stat-breakdown-label">{label}</div>
      <div className="dashboard-chip-list">
        {items.map((item) => (
          <span
            className="dashboard-chip"
            key={`${type}-${item.moneda}-${item.documentos ?? item.monto ?? 0}`}
          >
            {type === 'count'
              ? `${item.moneda} ${item.documentos}`
              : formatCurrencyAmount(item.moneda, item.monto)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardMetricCard({ card }) {
  const cardContent = (
    <div className={`card stat-card shadow-sm border-0 h-100${card.linkTo ? ' stat-card-clickable' : ''}`}>
      <div className="card-body">
        <div className="stat-card-accent" data-tone={card.tone} />
        <div className="w-100">
          <div className="stat-title">{card.title}</div>
          <div className="stat-value">{card.value}</div>
          <DashboardMetricBreakdown
            label={card.breakdownLabel}
            items={card.breakdownItems}
            type={card.breakdownType}
            emptyLabel={card.emptyLabel}
            summaryText={card.summaryText}
          />
        </div>
        {card.linkTo ? (
          <div className="stat-card-hover-hint" aria-hidden="true">
            Ver facturas filtradas
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!card.linkTo) {
    return cardContent;
  }

  return (
    <Link
      className="stat-card-link"
      to={card.linkTo}
      aria-label={`${card.title}: abrir facturas filtradas`}
    >
      {cardContent}
    </Link>
  );
}

export default DashboardMetricCard;
