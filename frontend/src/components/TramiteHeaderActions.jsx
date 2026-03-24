import { Link } from 'react-router-dom';

function TramiteHeaderActions({
  accionSiguiente,
  canExportReport,
  exportReportLoading,
  onAccionSiguiente,
  onExportReport,
  historialVisible,
  onToggleHistorial,
  labels
}) {
  const headerLabels = labels || {
    back: 'Volver',
    exportReport: 'Exportar reporte',
    exportingReport: 'Generando reporte...',
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
      {onExportReport && (
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={onExportReport}
          disabled={!canExportReport || exportReportLoading}
        >
          {exportReportLoading
            ? (headerLabels.exportingReport || 'Generando reporte...')
            : (headerLabels.exportReport || 'Exportar reporte')}
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
