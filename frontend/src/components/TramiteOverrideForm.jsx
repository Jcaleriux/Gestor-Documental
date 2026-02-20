import SectionCard from './common/SectionCard';

function TramiteOverrideForm({
  estados,
  overrideUser,
  overrideEstado,
  overrideMotivo,
  overrideError,
  onUserChange,
  onEstadoChange,
  onMotivoChange,
  onSubmit,
  labels
}) {
  const formLabels = labels || {
    title: 'Override de estado (admin)',
    user: 'Usuario',
    estado: 'Estado',
    motivo: 'Motivo',
    motivoPlaceholder: 'Motivo obligatorio',
    submit: 'Actualizar estado',
    select: 'Selecciona'
  };

  return (
    <SectionCard title={formLabels.title} className="table-card">
      <form onSubmit={onSubmit} className="row g-2">
        <div className="col-12 col-md-4">
          <label className="form-label">{formLabels.user}</label>
          <input
            className="form-control"
            value={overrideUser}
            onChange={(e) => onUserChange(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label">{formLabels.estado}</label>
          <select
            className="form-select"
            value={overrideEstado}
            onChange={(e) => onEstadoChange(e.target.value)}
          >
            <option value="">{formLabels.select}</option>
            {estados.map((estado) => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label">{formLabels.motivo}</label>
          <input
            className="form-control"
            value={overrideMotivo}
            onChange={(e) => onMotivoChange(e.target.value)}
            placeholder={formLabels.motivoPlaceholder}
          />
        </div>
        {overrideError && <div className="text-danger">{overrideError}</div>}
        <div className="col-12">
          <button className="btn btn-outline-primary" type="submit">
            {formLabels.submit}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

export default TramiteOverrideForm;
