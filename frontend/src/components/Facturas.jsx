import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFacturas } from '../hooks/useFacturas';
import { useFacturasFilters } from '../hooks/facturas/useFacturasFilters';
import { useFacturasReport } from '../hooks/facturas/useFacturasReport';
import { formatAmount, getMontoDocumento } from '../utils/formatters';
import { estadoClassFactura, estadoLabelFactura } from '../utils/estadosFactura';
import { withAuthToken } from '../utils/auth';
import StatusBadge from './common/StatusBadge';
import EmptyState from './common/EmptyState';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import SectionCard from './common/SectionCard';
import SearchInput from './common/SearchInput';
import FiltersBar from './common/FiltersBar';
import DataTable from './common/DataTable';
import FiltersPanel from './common/FiltersPanel';
import ActionAlerts from './common/ActionAlerts';
import { FACTURAS_LABELS, FACTURA_DETALLE_LABELS, LOADING_LABELS } from '../utils/uiLabels';

function Facturas({ sociedadId }) {
  const [showFilters, setShowFilters] = useState(false);

  const { facturas, loading } = useFacturas({ sociedadId });

  const {
    search,
    setSearch,
    estado,
    setEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    emisorNombre,
    setEmisorNombre,
    moneda,
    setMoneda,
    montoMin,
    setMontoMin,
    montoMax,
    setMontoMax,
    filtradas,
    hasActiveFilters,
    resetFilters,
    filterNotaCreditoForReport
  } = useFacturasFilters({ facturas });

  const {
    reportLoading,
    reportError,
    reportMessage,
    exportReport
  } = useFacturasReport({
    sociedadId,
    filtradas,
    filterNotaCreditoForReport
  });

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver los documentos.</p>;
  }

  if (loading) return <LoadingState label={LOADING_LABELS.facturas} />;

  return (
    <div className="documents-page">
      <PageHeader
        title={FACTURAS_LABELS.pageTitle}
        subtitle={FACTURAS_LABELS.pageSubtitle}
        actions={(
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={exportReport}
              disabled={reportLoading}
            >
              {reportLoading ? FACTURAS_LABELS.exportingReportButton : FACTURAS_LABELS.exportReportButton}
            </button>
            <button className="btn btn-primary" type="button">Subir nuevo documento</button>
          </div>
        )}
      />

      <ActionAlerts error={reportError} message={reportMessage} className="mb-3" />

      <FiltersBar>
        <SearchInput
          placeholder={FACTURAS_LABELS.searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          {FACTURAS_LABELS.filtersButton}
        </button>
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
        >
          {FACTURAS_LABELS.resetFiltersButton}
        </button>
      </FiltersBar>

      <FiltersPanel visible={showFilters}>
        <div className="filter-item">
          <label>{FACTURAS_LABELS.filters.estado}</label>
          <select className="form-select" value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="">{FACTURAS_LABELS.filters.estadoOptions.all}</option>
            <option value="no_contabilizado">{FACTURAS_LABELS.filters.estadoOptions.no_contabilizado}</option>
            <option value="contabilizado">{FACTURAS_LABELS.filters.estadoOptions.contabilizado}</option>
            <option value="en_revision">{FACTURAS_LABELS.filters.estadoOptions.en_revision}</option>
            <option value="en_tramite_pago">{FACTURAS_LABELS.filters.estadoOptions.en_tramite_pago}</option>
            <option value="pagado_parcialmente">{FACTURAS_LABELS.filters.estadoOptions.pagado_parcialmente}</option>
            <option value="en_aprobacion">{FACTURAS_LABELS.filters.estadoOptions.en_aprobacion}</option>
            <option value="rechazado">{FACTURAS_LABELS.filters.estadoOptions.rechazado}</option>
            <option value="pagado">{FACTURAS_LABELS.filters.estadoOptions.pagado}</option>
          </select>
        </div>
        <div className="filter-item">
          <label>{FACTURAS_LABELS.filters.emisor}</label>
          <input
            className="form-control"
            value={emisorNombre}
            onChange={(event) => setEmisorNombre(event.target.value)}
            placeholder={FACTURAS_LABELS.filters.emisorPlaceholder}
          />
        </div>
        <div className="filter-item">
          <label>{FACTURAS_LABELS.filters.moneda}</label>
          <select className="form-select" value={moneda} onChange={(event) => setMoneda(event.target.value)}>
            <option value="">{FACTURAS_LABELS.filters.monedaOptions.all}</option>
            <option value="CRC">{FACTURAS_LABELS.filters.monedaOptions.CRC}</option>
            <option value="USD">{FACTURAS_LABELS.filters.monedaOptions.USD}</option>
          </select>
        </div>
        <div className="filter-item">
          <label>{FACTURAS_LABELS.filters.desde}</label>
          <input
            type="date"
            className="form-control"
            value={fechaDesde}
            onChange={(event) => setFechaDesde(event.target.value)}
          />
        </div>
        <div className="filter-item">
          <label>{FACTURAS_LABELS.filters.hasta}</label>
          <input
            type="date"
            className="form-control"
            value={fechaHasta}
            onChange={(event) => setFechaHasta(event.target.value)}
          />
        </div>
        <div className="filter-item">
          <label>{FACTURAS_LABELS.filters.montoMin}</label>
          <input
            type="number"
            className="form-control"
            value={montoMin}
            onChange={(event) => setMontoMin(event.target.value)}
            placeholder={FACTURAS_LABELS.filters.montoMinPlaceholder}
          />
        </div>
        <div className="filter-item">
          <label>{FACTURAS_LABELS.filters.montoMax}</label>
          <input
            type="number"
            className="form-control"
            value={montoMax}
            onChange={(event) => setMontoMax(event.target.value)}
            placeholder={FACTURAS_LABELS.filters.montoMaxPlaceholder}
          />
        </div>
      </FiltersPanel>

      <SectionCard className="table-card" bodyClassName="p-0">
        <DataTable
          headers={[
            'Nombre',
            'Emisor',
            'Moneda',
            'Monto total',
            'Fecha',
            'Estado',
            'Acciones'
          ]}
        >
          {filtradas.map((factura) => (
            <tr key={factura.id}>
              <td className="fw-semibold">
                Factura #{factura.consecutivo || factura.numero_consecutivo}
              </td>
              <td>{factura.emisor?.Nombre || factura.emisor?.nombre || '-'}</td>
              <td>{factura.resumen?.CodigoTipoMoneda?.CodigoMoneda || factura.resumen?.CodigoMoneda || 'CRC'}</td>
              <td>{formatAmount(getMontoDocumento(factura, { preferAjustado: false }))}</td>
              <td>{factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString() : '-'}</td>
              <td>
                <StatusBadge
                  label={estadoLabelFactura(factura.estado)}
                  className={estadoClassFactura(factura.estado)}
                />
              </td>
              <td className="text-end">
                <Link className="btn btn-sm btn-outline-primary me-2" to={`/facturas/${factura.id}`}>
                  Ver
                </Link>
                {factura.ruta_pdf ? (
                  <a
                    className="btn btn-sm btn-outline-secondary me-2"
                    href={withAuthToken(`/api/files/pdf?path=${encodeURIComponent(factura.ruta_pdf)}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {FACTURA_DETALLE_LABELS.pdf.pdfOpenTab}
                  </a>
                ) : (
                  <button className="btn btn-sm btn-outline-secondary me-2" type="button" disabled>
                    {FACTURA_DETALLE_LABELS.pdf.pdfOpenTabUnavailable}
                  </button>
                )}
                <button className="btn btn-sm btn-light" type="button">...</button>
              </td>
            </tr>
          ))}
          {filtradas.length === 0 && (
            <tr>
              <td colSpan="7" className="py-4">
                <EmptyState className="text-center py-2">
                  {FACTURAS_LABELS.emptyFilters}
                </EmptyState>
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>

      <div className="pagination-row">
        <button className="btn btn-light" type="button">Previous</button>
        <div className="pagination-pages">
          <button className="btn btn-outline-secondary" type="button">1</button>
          <button className="btn btn-outline-secondary" type="button">2</button>
          <button className="btn btn-outline-secondary" type="button">3</button>
        </div>
        <button className="btn btn-light" type="button">Next</button>
      </div>
    </div>
  );
}

export default Facturas;
