function TramiteUnificadaHeader({
  tramiteId,
  sociedadLabel,
  totalDocs,
  totalMonto,
  resumenMoneda,
  actions,
  labels
}) {
  const headerLabels = labels || {
    title: 'Vista unificada',
    documentosActivos: 'Documentos activos',
    total: 'Total',
    sociedad: 'Sociedad'
  };
  return (
    <div className="px-3 pt-3">
      <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
        <div>
          <div className="fw-semibold">{headerLabels.title}</div>
          <div className="text-muted">
            Tramite #{tramiteId} - {headerLabels.sociedad}: {sociedadLabel}
          </div>
          <div className="text-muted">
            {headerLabels.documentosActivos}: {totalDocs} - {headerLabels.total}: {totalMonto}
            {resumenMoneda && <span> - {resumenMoneda}</span>}
          </div>
        </div>
        {actions && (
          <div className="d-flex gap-2 flex-wrap justify-content-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default TramiteUnificadaHeader;
