import StatusBadge from './common/StatusBadge';

function TramiteMeta({ estado, creadoPor, creadoEn, totalDocs, totalMonto, resumenMoneda, estadoClass }) {
  return (
    <div className="tramite-detail-meta">
      <div>
        <div className="stat-title">Estado</div>
        <StatusBadge label={estado} className={estadoClass} />
      </div>
      <div>
        <div className="stat-title">Creado por</div>
        <div className="stat-value-sm">{creadoPor || '-'}</div>
      </div>
      <div>
        <div className="stat-title">Creado</div>
        <div className="stat-value-sm">{creadoEn || '-'}</div>
      </div>
      <div>
        <div className="stat-title">Documentos</div>
        <div className="stat-value-sm">{totalDocs}</div>
      </div>
      <div>
        <div className="stat-title">Total</div>
        <div className="stat-value-sm">{totalMonto}</div>
        {resumenMoneda && <div className="stat-meta">{resumenMoneda}</div>}
      </div>
    </div>
  );
}

export default TramiteMeta;
