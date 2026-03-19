import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';
import { formatCurrencyAmount } from './dashboardViewModel.js';

function DashboardCurrencyTotalsSection({ monedas, totalesPorMoneda }) {
  return (
    <SectionCard title="Totales por moneda (neto a pagar)" className="section-card">
      {monedas.length === 0 && <EmptyState className="py-2">Sin datos de montos.</EmptyState>}
      {monedas.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Moneda</th>
                <th>No contabilizadas</th>
                <th>Contabilizadas</th>
                <th>En tramite</th>
                <th>Pagadas</th>
              </tr>
            </thead>
            <tbody>
              {monedas.map((moneda) => {
                const row = totalesPorMoneda[moneda] || {};
                const noConta = row.no_contabilizadas || { count: 0, total: 0 };
                const conta = row.contabilizadas || { count: 0, total: 0 };
                const enTramite = row.en_tramite || { count: 0, total: 0 };
                const pagadas = row.pagadas || { count: 0, total: 0 };
                return (
                  <tr key={moneda}>
                    <td className="fw-semibold">{moneda}</td>
                    <td>
                      {noConta.count} / {formatCurrencyAmount(moneda, noConta.total)}
                    </td>
                    <td>
                      {conta.count} / {formatCurrencyAmount(moneda, conta.total)}
                    </td>
                    <td>
                      {enTramite.count} / {formatCurrencyAmount(moneda, enTramite.total)}
                    </td>
                    <td>
                      {pagadas.count} / {formatCurrencyAmount(moneda, pagadas.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export default DashboardCurrencyTotalsSection;
