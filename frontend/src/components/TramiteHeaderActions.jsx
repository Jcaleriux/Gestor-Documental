import { Link } from 'react-router-dom';

function TramiteHeaderActions({
  accionSiguiente,
  onAccionSiguiente,
  historialVisible,
  onToggleHistorial,
  labels
}) {
  const headerLabels = labels || {
    back: 'Volver',
    toggleHistory: {
      show: 'Ver historial',
      hide: 'Ocultar historial'
    }
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
    </>
  );
}

export default TramiteHeaderActions;
