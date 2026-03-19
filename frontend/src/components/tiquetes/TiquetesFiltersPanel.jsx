import { TIQUETES_ELECTRONICOS_LABELS } from '../../utils/uiLabels.js';
import FiltersPanel from '../common/FiltersPanel.jsx';

function TiquetesFiltersPanel({
  visible,
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
        <label>{TIQUETES_ELECTRONICOS_LABELS.filters.emisor}</label>
        <input
          className="form-control"
          value={emisorNombre}
          onChange={(event) => setEmisorNombre(event.target.value)}
          placeholder={TIQUETES_ELECTRONICOS_LABELS.filters.emisorPlaceholder}
        />
      </div>
      <div className="filter-item">
        <label>{TIQUETES_ELECTRONICOS_LABELS.filters.moneda}</label>
        <select className="form-select" value={moneda} onChange={(event) => setMoneda(event.target.value)}>
          <option value="">{TIQUETES_ELECTRONICOS_LABELS.filters.monedaOptions.all}</option>
          <option value="CRC">{TIQUETES_ELECTRONICOS_LABELS.filters.monedaOptions.CRC}</option>
          <option value="USD">{TIQUETES_ELECTRONICOS_LABELS.filters.monedaOptions.USD}</option>
        </select>
      </div>
      <div className="filter-item">
        <label>{TIQUETES_ELECTRONICOS_LABELS.filters.desde}</label>
        <input
          type="date"
          className="form-control"
          value={fechaDesde}
          onChange={(event) => setFechaDesde(event.target.value)}
        />
      </div>
      <div className="filter-item">
        <label>{TIQUETES_ELECTRONICOS_LABELS.filters.hasta}</label>
        <input
          type="date"
          className="form-control"
          value={fechaHasta}
          onChange={(event) => setFechaHasta(event.target.value)}
        />
      </div>
      <div className="filter-item">
        <label>{TIQUETES_ELECTRONICOS_LABELS.filters.montoMin}</label>
        <input
          type="number"
          className="form-control"
          value={montoMin}
          onChange={(event) => setMontoMin(event.target.value)}
          placeholder={TIQUETES_ELECTRONICOS_LABELS.filters.montoMinPlaceholder}
        />
      </div>
      <div className="filter-item">
        <label>{TIQUETES_ELECTRONICOS_LABELS.filters.montoMax}</label>
        <input
          type="number"
          className="form-control"
          value={montoMax}
          onChange={(event) => setMontoMax(event.target.value)}
          placeholder={TIQUETES_ELECTRONICOS_LABELS.filters.montoMaxPlaceholder}
        />
      </div>
    </FiltersPanel>
  );
}

export default TiquetesFiltersPanel;
