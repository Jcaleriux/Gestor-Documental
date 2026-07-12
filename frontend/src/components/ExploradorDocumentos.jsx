import { useMemo, useState } from 'react';
import { useExploradorDocumentos } from '../hooks/useExploradorDocumentos.js';
import LoadingState from './common/LoadingState.jsx';
import ExploradorFilters from './explorador/ExploradorFilters.jsx';
import ExploradorResumen from './explorador/ExploradorResumen.jsx';
import ExploradorDetalle from './explorador/ExploradorDetalle.jsx';
import {
  formatDate,
  formatEstado,
  formatMoney,
  getAvailableCurrencies,
} from './explorador/exploradorDocumentosView.js';

const EMPTY_FILTERS = Object.freeze({
  busqueda: '',
  estado: '',
  moneda: '',
  proveedor: '',
  centroCosto: '',
  fechaDesde: '',
  fechaHasta: '',
});

function ExploradorDocumentos({ sociedadId, selectedSociedadName = '' }) {
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState(null);
  const [chartCurrency, setChartCurrency] = useState('CRC');
  const { resumen, documentos, paginacion, loading, error, refetch } = useExploradorDocumentos({
    sociedadId,
    filters,
    page,
    pageSize,
  });
  const selected = useMemo(
    () => documentos.find((item) => item.id === selectedId) || documentos[0] || null,
    [documentos, selectedId],
  );
  const currencies = getAvailableCurrencies(resumen);
  const visibleChartCurrency = currencies.includes(chartCurrency)
    ? chartCurrency
    : (currencies[0] || chartCurrency);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setSelectedId(null);
    setFilters({ ...draftFilters });
  };
  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSelectedId(null);
  };

  if (!sociedadId) {
    return <p>Seleccione una sociedad para abrir el explorador de documentos.</p>;
  }

  return (
    <div className="container-fluid explorer-page">
      <header className="explorer-header">
        <div>
          <div className="dashboard-eyebrow">Compras y cuentas por pagar</div>
          <h2>Explorador de documentos</h2>
          <p>{selectedSociedadName || 'Sociedad seleccionada'}</p>
        </div>
        <div className="explorer-header-count">
          <span>Documentos filtrados</span>
          <strong>{resumen.totalDocumentos}</strong>
        </div>
      </header>

      <ExploradorFilters
        values={draftFilters}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        loading={loading}
      />

      {error && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center gap-3" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refetch}>Reintentar</button>
        </div>
      )}

      {loading && documentos.length === 0 ? <LoadingState label="Cargando explorador..." /> : (
        <>
          <div className="explorer-currency-summary">
            {resumen.totalesPorMoneda.map((item) => (
              <section key={item.moneda} className="explorer-currency-item">
                <div><span>{item.moneda}</span><small>{item.documentos} documentos</small></div>
                <div><span>Total emitido</span><strong>{formatMoney(item.total, item.moneda)}</strong></div>
                <div><span>Saldo pendiente</span><strong>{formatMoney(item.pendiente, item.moneda)}</strong></div>
              </section>
            ))}
          </div>

          <ExploradorResumen resumen={resumen} currency={visibleChartCurrency} onCurrencyChange={setChartCurrency} />

          <div className="explorer-workspace">
            <section className="explorer-table-panel">
              <div className="explorer-table-header">
                <div><h3>Documentos</h3><span>{paginacion.totalItems} resultados</span></div>
                <label>
                  <span>Filas</span>
                  <select className="form-select form-select-sm" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                    <option value="10">10</option><option value="25">25</option><option value="50">50</option>
                  </select>
                </label>
              </div>
              <div className="table-responsive">
                <table className="table explorer-table">
                  <thead><tr><th>Documento</th><th>Proveedor</th><th>Emision</th><th>Estado</th><th className="text-end">Total</th><th className="text-end">Pendiente</th></tr></thead>
                  <tbody>
                    {documentos.map((item) => (
                      <tr key={item.id} className={selected?.id === item.id ? 'selected' : ''}>
                        <td><button type="button" className="explorer-select-document" onClick={() => setSelectedId(item.id)}>{item.consecutivo}<span>{item.clave}</span></button></td>
                        <td><strong>{item.proveedorNombre}</strong><span>{item.proveedorIdentificacion}</span></td>
                        <td>{formatDate(item.fechaEmision)}</td>
                        <td><span className={`explorer-state explorer-state-${item.estado}`}>{formatEstado(item.estado)}</span></td>
                        <td className="text-end explorer-money">{formatMoney(item.total, item.moneda)}</td>
                        <td className="text-end explorer-money explorer-money-pending">{formatMoney(item.pendienteGlobal, item.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {documentos.length === 0 && <div className="explorer-empty">No hay documentos para los filtros seleccionados.</div>}
              </div>
              <div className="explorer-pagination">
                <span>Pagina {paginacion.page} de {paginacion.totalPages}</span>
                <div>
                  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!paginacion.hasPrev || loading} onClick={() => setPage((value) => value - 1)}>Anterior</button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!paginacion.hasNext || loading} onClick={() => setPage((value) => value + 1)}>Siguiente</button>
                </div>
              </div>
            </section>
            <ExploradorDetalle documento={selected} />
          </div>
        </>
      )}
    </div>
  );
}

export default ExploradorDocumentos;
