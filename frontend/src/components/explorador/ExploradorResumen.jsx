import { formatEstado, formatMoney, getMonthlySeries } from './exploradorDocumentosView.js';

function ExploradorResumen({ resumen, currency, onCurrencyChange }) {
  const currencies = resumen.totalesPorMoneda.map((item) => item.moneda);
  const monthly = getMonthlySeries(resumen, currency);
  const maxMonthly = Math.max(...monthly.map((item) => item.total), 1);
  const providers = resumen.topProveedores.filter((item) => item.moneda === currency);
  const maxProviders = Math.max(...providers.map((item) => item.monto), 1);
  const maxStatus = Math.max(...resumen.estados.map((item) => item.documentos), 1);

  return (
    <div className="explorer-overview">
      <section className="explorer-panel explorer-monthly" aria-labelledby="explorer-monthly-title">
        <div className="explorer-panel-header">
          <div>
            <h3 id="explorer-monthly-title">Evolucion mensual</h3>
            <span>Totales emitidos</span>
          </div>
          {currencies.length > 1 && (
            <div className="explorer-segmented" aria-label="Moneda del grafico">
              {currencies.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={item === currency ? 'active' : ''}
                  onClick={() => onCurrencyChange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        {monthly.length > 0 ? (
          <div className="explorer-bars" aria-label={`Evolucion mensual en ${currency}`}>
            {monthly.map((item) => (
              <div className="explorer-bar-column" key={`${item.mes}-${item.moneda}`} title={`${item.mes}: ${formatMoney(item.total, item.moneda)}`}>
                <div className="explorer-bar-value">{item.documentos}</div>
                <div className="explorer-bar-track">
                  <div className="explorer-bar" style={{ height: `${Math.max(6, (item.total / maxMonthly) * 100)}%` }} />
                </div>
                <div className="explorer-bar-label">{item.mes?.slice(5)}</div>
              </div>
            ))}
          </div>
        ) : <div className="explorer-empty-compact">Sin datos para esta moneda.</div>}
      </section>

      <section className="explorer-panel" aria-labelledby="explorer-providers-title">
        <div className="explorer-panel-header">
          <div>
            <h3 id="explorer-providers-title">Principales proveedores</h3>
            <span>Saldo pendiente en {currency}</span>
          </div>
        </div>
        <div className="explorer-ranked-list">
          {providers.map((item) => (
            <div className="explorer-ranked-item" key={`${item.moneda}-${item.proveedorIdentificacion}-${item.proveedorNombre}`}>
              <div className="explorer-ranked-copy">
                <strong>{item.proveedorNombre}</strong>
                <span>{item.documentos} documentos · {formatMoney(item.monto, item.moneda)}</span>
              </div>
              <div className="explorer-ranked-track"><div style={{ width: `${(item.monto / maxProviders) * 100}%` }} /></div>
            </div>
          ))}
          {providers.length === 0 && <div className="explorer-empty-compact">Sin saldos pendientes.</div>}
        </div>
      </section>

      <section className="explorer-panel" aria-labelledby="explorer-status-title">
        <div className="explorer-panel-header">
          <div>
            <h3 id="explorer-status-title">Estados</h3>
            <span>Distribucion documental</span>
          </div>
        </div>
        <div className="explorer-status-list">
          {resumen.estados.map((item) => (
            <div className="explorer-status-row" key={item.estado}>
              <div><span>{formatEstado(item.estado)}</span><strong>{item.documentos}</strong></div>
              <div className="explorer-status-track"><div style={{ width: `${(item.documentos / maxStatus) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ExploradorResumen;
