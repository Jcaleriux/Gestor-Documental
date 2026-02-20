import { Link } from 'react-router-dom';

function TramiteActions({
  facturaId,
  puedeGerencia,
  puedeGerenciaContable,
  puedeFinanciera,
  puedeTesoreria,
  destinosTesoreria,
  destinoSeleccionado,
  onDestinoChange,
  onDecision,
  onAccionTesoreria,
  isExcluido = false,
  showReincluir = true,
  className = '',
  labels
}) {
  const actionLabels = labels || {
    aprobar: 'Aprobar',
    rechazar: 'Rechazar',
    reenviar: 'Reenviar',
    excluir: 'Excluir',
    reincluir: 'Reincluir',
    destinoPlaceholder: 'Destino...',
    ver: 'Ver'
  };
  return (
    <div className={`tramite-doc-actions ${className}`.trim()}>
      <Link className="btn btn-sm btn-outline-primary" to={`/facturas/${facturaId}`}>
        {actionLabels.ver}
      </Link>
      {puedeGerencia && (
        <>
          <button
            className="btn btn-sm btn-success"
            onClick={() => onDecision(facturaId, 'gerencia', 'aprobado')}
          >
            {actionLabels.aprobar}
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDecision(facturaId, 'gerencia', 'rechazado')}
          >
            {actionLabels.rechazar}
          </button>
        </>
      )}
      {puedeGerenciaContable && (
        <>
          <button
            className="btn btn-sm btn-success"
            onClick={() => onDecision(facturaId, 'gerencia_contable', 'aprobado')}
          >
            {actionLabels.aprobar}
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDecision(facturaId, 'gerencia_contable', 'rechazado')}
          >
            {actionLabels.rechazar}
          </button>
        </>
      )}
      {puedeFinanciera && (
        <>
          <button
            className="btn btn-sm btn-success"
            onClick={() => onDecision(facturaId, 'financiera', 'aprobado')}
          >
            {actionLabels.aprobar}
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => onDecision(facturaId, 'financiera', 'rechazado')}
          >
            {actionLabels.rechazar}
          </button>
        </>
      )}
      {puedeTesoreria && (
        <>
          <select
            className="form-select form-select-sm"
            value={destinoSeleccionado || ''}
            onChange={(e) => onDestinoChange(facturaId, e.target.value)}
          >
            <option value="">{actionLabels.destinoPlaceholder}</option>
            {destinosTesoreria.map((destino) => (
              <option key={destino.value} value={destino.value}>
                {destino.label}
              </option>
            ))}
          </select>
          {showReincluir && isExcluido ? (
            <button
              className="btn btn-sm btn-outline-success"
              onClick={() => onAccionTesoreria(facturaId, 'reincluir')}
            >
              {actionLabels.reincluir}
            </button>
          ) : (
            <>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => onAccionTesoreria(facturaId, 'reenviar')}
              >
                {actionLabels.reenviar}
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => onAccionTesoreria(facturaId, 'excluir')}
              >
                {actionLabels.excluir}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default TramiteActions;
