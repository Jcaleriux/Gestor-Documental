const ESTADOS = [
  ['', 'Todos'],
  ['no_contabilizado', 'No contabilizadas'],
  ['en_revision', 'En revision'],
  ['contabilizado', 'Contabilizadas'],
  ['en_tramite_pago', 'En tramite de pago'],
  ['pagado_parcialmente', 'Pago parcial'],
  ['pagado', 'Pagadas'],
  ['rechazado', 'Rechazadas'],
];

function ExploradorFilters({ values, onChange, onApply, onReset, loading }) {
  const update = (field) => (event) => onChange({ ...values, [field]: event.target.value });

  return (
    <form className="explorer-filters" onSubmit={onApply}>
      <label className="explorer-filter explorer-filter-search">
        <span>Buscar</span>
        <input
          className="form-control"
          value={values.busqueda}
          onChange={update('busqueda')}
          placeholder="Consecutivo, clave o proveedor"
        />
      </label>
      <label className="explorer-filter">
        <span>Estado</span>
        <select className="form-select" value={values.estado} onChange={update('estado')}>
          {ESTADOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="explorer-filter">
        <span>Moneda</span>
        <select className="form-select" value={values.moneda} onChange={update('moneda')}>
          <option value="">Todas</option>
          <option value="CRC">CRC</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <label className="explorer-filter">
        <span>Proveedor</span>
        <input className="form-control" value={values.proveedor} onChange={update('proveedor')} />
      </label>
      <label className="explorer-filter">
        <span>Centro de costo</span>
        <input className="form-control" value={values.centroCosto} onChange={update('centroCosto')} />
      </label>
      <label className="explorer-filter">
        <span>Desde</span>
        <input type="date" className="form-control" value={values.fechaDesde} onChange={update('fechaDesde')} />
      </label>
      <label className="explorer-filter">
        <span>Hasta</span>
        <input type="date" className="form-control" value={values.fechaHasta} onChange={update('fechaHasta')} />
      </label>
      <div className="explorer-filter-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>Aplicar</button>
        <button className="btn btn-outline-secondary" type="button" onClick={onReset} disabled={loading}>Limpiar</button>
      </div>
    </form>
  );
}

export default ExploradorFilters;
