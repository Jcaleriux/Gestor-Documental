import { NOTAS_CREDITO_LABELS } from '../../utils/uiLabels.js';
import FiltersPanel from '../common/FiltersPanel.jsx';

function NotasCreditoFiltersPanel({
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
        <label>{NOTAS_CREDITO_LABELS.filters.estado}</label>
        <select className="form-select" value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="">{NOTAS_CREDITO_LABELS.filters.estadoOptions.all}</option>
          <option value="disponible">{NOTAS_CREDITO_LABELS.filters.estadoOptions.disponible}</option>
          <option value="aplicada">{NOTAS_CREDITO_LABELS.filters.estadoOptions.aplicada}</option>
        </select>
      </div>
      <div className="filter-item">
        <label>{NOTAS_CREDITO_LABELS.filters.emisor}</label>
        <input
          className="form-control"
          value={emisorNombre}
          onChange={(event) => setEmisorNombre(event.target.value)}
          placeholder={NOTAS_CREDITO_LABELS.filters.emisorPlaceholder}
        />
      </div>
      <div className="filter-item">
        <label>{NOTAS_CREDITO_LABELS.filters.moneda}</label>
        <select className="form-select" value={moneda} onChange={(event) => setMoneda(event.target.value)}>
          <option value="">{NOTAS_CREDITO_LABELS.filters.monedaOptions.all}</option>
          <option value="CRC">{NOTAS_CREDITO_LABELS.filters.monedaOptions.CRC}</option>
          <option value="USD">{NOTAS_CREDITO_LABELS.filters.monedaOptions.USD}</option>
        </select>
      </div>
      <div className="filter-item">
        <label>{NOTAS_CREDITO_LABELS.filters.desde}</label>
        <input
          type="date"
          className="form-control"
          value={fechaDesde}
          onChange={(event) => setFechaDesde(event.target.value)}
        />
      </div>
      <div className="filter-item">
        <label>{NOTAS_CREDITO_LABELS.filters.hasta}</label>
        <input
          type="date"
          className="form-control"
          value={fechaHasta}
          onChange={(event) => setFechaHasta(event.target.value)}
        />
      </div>
      <div className="filter-item">
        <label>{NOTAS_CREDITO_LABELS.filters.montoMin}</label>
        <input
          type="number"
          className="form-control"
          value={montoMin}
          onChange={(event) => setMontoMin(event.target.value)}
          placeholder={NOTAS_CREDITO_LABELS.filters.montoMinPlaceholder}
        />
      </div>
      <div className="filter-item">
        <label>{NOTAS_CREDITO_LABELS.filters.montoMax}</label>
        <input
          type="number"
          className="form-control"
          value={montoMax}
          onChange={(event) => setMontoMax(event.target.value)}
          placeholder={NOTAS_CREDITO_LABELS.filters.montoMaxPlaceholder}
        />
      </div>
    </FiltersPanel>
  );
}

export default NotasCreditoFiltersPanel;
