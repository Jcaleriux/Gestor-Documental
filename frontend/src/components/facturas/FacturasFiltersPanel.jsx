import { FACTURAS_LABELS } from '../../utils/uiLabels.js';
import FiltersPanel from '../common/FiltersPanel.jsx';

function FacturasFiltersPanel({
  visible,
  estado,
  setEstado,
  emisorNombre,
  setEmisorNombre,
  moneda,
  setMoneda,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  montoMin,
  setMontoMin,
  montoMax,
  setMontoMax,
}) {
  return (
    <FiltersPanel visible={visible} className="facturas-filters-panel">
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
  );
}

export default FacturasFiltersPanel;
