import { Link } from 'react-router-dom';

function TramiteHeaderActions({
  accionSiguiente,
  onAccionSiguiente,
  historialVisible,
  onToggleHistorial,
  rolActivo,
  onRolChange,
  roles,
  labels
}) {
  const headerLabels = labels || {
    back: 'Volver',
    toggleHistory: {
      show: 'Ver historial',
      hide: 'Ocultar historial'
    },
    roleLabel: 'Actuar como'
  };

  return (
    <>
      {headerLabels.back && (
        <Link className="btn btn-light" to="/tramites">
          {headerLabels.back}
        </Link>
      )}
      {accionSiguiente && (
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => onAccionSiguiente(accionSiguiente.estado)}
        >
          {accionSiguiente.label}
        </button>
      )}
      <button
        className="btn btn-outline-secondary"
        type="button"
        onClick={onToggleHistorial}
      >
        {historialVisible ? headerLabels.toggleHistory.hide : headerLabels.toggleHistory.show}
      </button>
      <div className="tramite-role-select">
        <label className="form-label">{headerLabels.roleLabel}</label>
        <select
          className="form-select"
          value={rolActivo}
          onChange={(e) => onRolChange(e.target.value)}
        >
          {roles.map((rol) => (
            <option key={rol.value} value={rol.value}>
              {rol.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default TramiteHeaderActions;
