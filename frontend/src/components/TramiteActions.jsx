import { Link } from 'react-router-dom';

function TramiteActions({
  facturaId,
  puedeGerencia,
  puedeGerenciaContable,
  puedeFinanciera,
  puedeTesoreria,
  sociedadId,
  destinosTesoreria,
  destinoSeleccionado,
  onDestinoChange,
  onDecision,
  onAccionTesoreria,
  isExcluido = false,
  isDevueltoContabilidad = false,
  showReincluir = true,
  className = '',
  labels
}) {
  const actionLabels = labels || {
    aprobar: 'Aprobar',
    rechazar: 'Rechazar',
    reenviar: 'Reenviar',
    excluir: 'Excluir',
    devolverContabilidad: 'Devolver a contabilidad',
    reincluir: 'Reincluir',
    destinoPlaceholder: 'Destino...',
    ver: 'Ver'
  };
  const viewUrlSearch = new URLSearchParams({ readonly: '1' });
  if (sociedadId) {
    viewUrlSearch.set('sociedad', String(sociedadId));
  }
  const viewUrl = `/facturas/${facturaId}/contabilizacion?${viewUrlSearch.toString()}`;

  return (
    <div className={`tramite-doc-actions ${className}`.trim()}>
      <Link
        className="btn btn-sm btn-outline-primary"
        to={viewUrl}
        target="_blank"
        rel="noreferrer"
      >
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
          {showReincluir && isExcluido ? (
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
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => onAccionTesoreria(facturaId, 'reincluir')}
              >
                {actionLabels.reincluir}
              </button>
            </>
          ) : !isExcluido && !isDevueltoContabilidad ? (
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
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => onAccionTesoreria(facturaId, 'devolver_contabilidad')}
              >
                {actionLabels.devolverContabilidad}
              </button>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

export default TramiteActions;
