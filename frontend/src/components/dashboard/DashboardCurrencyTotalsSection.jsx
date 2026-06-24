import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';
import { formatCurrencyAmount } from './dashboardViewModel.js';

function DashboardCurrencyTotalsSection({ currencySummary }) {
  return (
    <SectionCard title="Resumen por moneda" className="section-card">
      {currencySummary.length === 0 && <EmptyState className="py-2">Sin datos de montos.</EmptyState>}
      {currencySummary.length > 0 && (
        <div className="dashboard-currency-card-list">
          {currencySummary.map((currency) => (
            <div className="dashboard-currency-card" key={currency.moneda}>
              <div className="dashboard-currency-card-header">
                <span>{currency.moneda}</span>
                <span>Neto a pagar</span>
              </div>
              <div className="dashboard-currency-lines">
                {currency.items.map((item) => (
                  <div className="dashboard-currency-line" key={`${currency.moneda}-${item.key}`}>
                    <div>
                      <div className="dashboard-currency-line-label">{item.label}</div>
                      <div className="dashboard-currency-line-docs">{item.count} docs</div>
                    </div>
                    <div className="dashboard-currency-line-amount">
                      {formatCurrencyAmount(currency.moneda, item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default DashboardCurrencyTotalsSection;
