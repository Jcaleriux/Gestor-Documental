import { useCallback } from 'react';
import { usePdfsPendientes, buildPdfPendienteKey } from '../hooks/facturas/usePdfsPendientes.js';
import { openProtectedInNewTab } from '../utils/protectedResources.js';
import { PDFS_PENDIENTES_LABELS } from '../utils/uiLabels.js';
import ActionAlerts from './common/ActionAlerts.jsx';
import DataTable from './common/DataTable.jsx';
import EmptyState from './common/EmptyState.jsx';
import LoadingState from './common/LoadingState.jsx';
import PageHeader from './common/PageHeader.jsx';
import SearchInput from './common/SearchInput.jsx';
import SectionCard from './common/SectionCard.jsx';

const labels = PDFS_PENDIENTES_LABELS;

const pendingHeaders = [
  { key: 'lote', label: labels.columns.lote },
  { key: 'pdf', label: labels.columns.pdf },
  { key: 'motivo', label: labels.columns.motivo },
  { key: 'acciones', label: labels.columns.acciones, align: 'end' },
];

const candidateHeaders = [
  { key: 'selector', label: '' },
  { key: 'documento', label: labels.columns.documento },
  { key: 'emisor', label: labels.columns.emisor },
  { key: 'receptor', label: labels.columns.receptor },
  { key: 'fecha', label: labels.columns.fecha },
  { key: 'estado', label: labels.columns.estado, align: 'end' },
];

const buildPdfUrl = (ruta) => `/api/files/pdf?path=${encodeURIComponent(ruta)}`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-CR').format(date);
};

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatAmount = (value, moneda) => {
  const amount = Number(value || 0);
  return `${moneda || 'CRC'} ${amount.toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getSociedadName = (candidate) => (
  candidate?.sociedad_nombre_proyecto || candidate?.sociedad_razon_social || ''
);

function PdfsPendientes({ sociedadId }) {
  const {
    items,
    summary,
    loading,
    actionError,
    message,
    selectedKey,
    selectedPdf,
    selectPdf,
    candidateQuery,
    setCandidateQuery,
    candidates,
    candidatesLoading,
    searchCandidates,
    selectedFacturaId,
    setSelectedFacturaId,
    selectedCandidate,
    overwrite,
    setOverwrite,
    assigning,
    assignSelectedPdf,
    refetch,
    setActionError,
  } = usePdfsPendientes({ sociedadId });

  const handleOpenPdf = useCallback(async (item) => {
    if (!item?.ruta) return;

    try {
      setActionError('');
      await openProtectedInNewTab(buildPdfUrl(item.ruta));
    } catch (error) {
      setActionError(error?.message || 'No se pudo abrir el PDF pendiente.');
    }
  }, [setActionError]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    searchCandidates();
  };

  const selectedCandidateHasPdf = Boolean(selectedCandidate?.has_pdf || selectedCandidate?.ruta_pdf);
  const assignDisabled = assigning
    || !selectedPdf
    || !selectedFacturaId
    || (selectedCandidateHasPdf && !overwrite);

  if (loading && items.length === 0) {
    return <LoadingState label={labels.loading} />;
  }

  return (
    <div className="documents-page facturas-page pdfs-pendientes-page">
      <PageHeader
        title={labels.pageTitle}
        subtitle={labels.pageSubtitle}
        actions={(
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={refetch}
            disabled={loading}
          >
            {labels.refreshButton}
          </button>
        )}
      />

      <ActionAlerts error={actionError} message={message} className="mb-0" />

      {!sociedadId ? (
        <div className="alert alert-warning mb-0">{labels.noSociedad}</div>
      ) : null}

      <div className="facturas-summary-grid pdfs-pendientes-summary">
        <div className="facturas-summary-card">
          <span className="facturas-summary-label">Pendientes</span>
          <strong className="facturas-summary-value">{summary.totalPdfs}</strong>
          <span className="facturas-summary-meta">PDFs sin asociacion</span>
        </div>
        <div className="facturas-summary-card">
          <span className="facturas-summary-label">Lotes</span>
          <strong className="facturas-summary-value">{summary.totalLotes}</strong>
          <span className="facturas-summary-meta">Importaciones con pendientes</span>
        </div>
        <div className="facturas-summary-card">
          <span className="facturas-summary-label">Seleccionado</span>
          <strong className="facturas-summary-value">
            {selectedPdf?.savedAs || '-'}
          </strong>
          <span className="facturas-summary-meta">
            {selectedPdf ? formatBytes(selectedPdf.sizeBytes) : 'Sin PDF activo'}
          </span>
        </div>
      </div>

      <div className="pdfs-pendientes-layout">
        <SectionCard
          title="PDFs pendientes"
          className="table-card pdfs-pendientes-list-card"
          bodyClassName={items.length > 0 ? 'p-0' : ''}
        >
          {items.length === 0 ? (
            <EmptyState className="py-2">{labels.empty}</EmptyState>
          ) : (
            <DataTable headers={pendingHeaders} tableClassName="table align-middle mb-0 pdfs-pendientes-table">
              {items.map((item) => {
                const key = buildPdfPendienteKey(item);
                const isSelected = key === selectedKey;

                return (
                  <tr key={key} className={isSelected ? 'table-active' : ''}>
                    <td>
                      <div className="pdfs-pending-main">
                        <strong>{item.ingestion_id}</strong>
                        <span>{item.report_path}</span>
                      </div>
                    </td>
                    <td>
                      <div className="pdfs-pending-main">
                        <strong>{item.originalName || item.savedAs}</strong>
                        <span>{item.ruta}</span>
                      </div>
                    </td>
                    <td>
                      <div className="pdfs-pending-main">
                        <span>{item.motivo || '-'}</span>
                        <span>{item.exists ? formatBytes(item.sizeBytes) : 'Archivo no encontrado'}</span>
                      </div>
                    </td>
                    <td className="text-end">
                      <div className="pdfs-pending-actions">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => selectPdf(item)}
                        >
                          Seleccionar
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          type="button"
                          onClick={() => handleOpenPdf(item)}
                          disabled={!item.exists}
                        >
                          {labels.openPdfButton}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </SectionCard>

        <SectionCard title="Resolver PDF" className="pdfs-pendientes-resolver-card">
          {!selectedPdf ? (
            <EmptyState>{labels.noSelection}</EmptyState>
          ) : (
            <>
              <div className="pdfs-selected-detail">
                <div>
                  <span>PDF</span>
                  <strong>{selectedPdf.originalName || selectedPdf.savedAs}</strong>
                </div>
                <div>
                  <span>Lote</span>
                  <strong>{selectedPdf.ingestion_id}</strong>
                </div>
                <div>
                  <span>Ruta</span>
                  <strong>{selectedPdf.ruta}</strong>
                </div>
              </div>

              <form className="pdfs-candidate-search" onSubmit={handleSearchSubmit}>
                <SearchInput
                  value={candidateQuery}
                  onChange={(event) => setCandidateQuery(event.target.value)}
                  placeholder={labels.searchPlaceholder}
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!sociedadId || candidatesLoading || !candidateQuery.trim()}
                >
                  {candidatesLoading ? labels.searchingButton : labels.searchButton}
                </button>
              </form>

              {candidates.length > 0 ? (
                <DataTable
                  headers={candidateHeaders}
                  className="pdfs-candidates-table-wrap"
                  tableClassName="table align-middle mb-0 pdfs-candidates-table"
                >
                  {candidates.map((candidate) => {
                    const candidateId = String(candidate.id);
                    const isSelected = candidateId === String(selectedFacturaId);

                    return (
                      <tr key={candidate.id} className={isSelected ? 'table-active' : ''}>
                        <td>
                          <input
                            className="form-check-input"
                            type="radio"
                            name="factura-destino"
                            aria-label={`Seleccionar factura ${candidate.consecutivo || candidate.id}`}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedFacturaId(candidateId);
                              setOverwrite(false);
                            }}
                          />
                        </td>
                        <td>
                          <div className="pdfs-pending-main">
                            <strong>Factura #{candidate.consecutivo || candidate.id}</strong>
                            <span>{candidate.clave || '-'}</span>
                            <span>{getSociedadName(candidate)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="pdfs-pending-main">
                            <strong>{candidate.emisor_nombre || '-'}</strong>
                            <span>{candidate.emisor_identificacion || '-'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="pdfs-pending-main">
                            <strong>{candidate.receptor_nombre || '-'}</strong>
                            <span>{candidate.receptor_identificacion || '-'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="pdfs-pending-main">
                            <strong>{formatDate(candidate.fecha_emision)}</strong>
                            <span>{formatAmount(candidate.total, candidate.moneda)}</span>
                          </div>
                        </td>
                        <td className="text-end">
                          <span className={`status-badge ${candidate.has_pdf ? 'badge-soft-warning' : 'badge-soft-success'}`}>
                            {candidate.has_pdf ? 'Con PDF' : 'Sin PDF'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
              ) : (
                <EmptyState className="pdfs-candidates-empty">
                  {candidateQuery ? labels.noCandidates : labels.noSelection}
                </EmptyState>
              )}

              {selectedCandidate ? (
                <div className="pdfs-assignment-footer">
                  <div className="pdfs-assignment-target">
                    <span>{labels.selectedCandidate}</span>
                    <strong>Factura #{selectedCandidate.consecutivo || selectedCandidate.id}</strong>
                  </div>

                  {selectedCandidateHasPdf ? (
                    <label className="pdfs-overwrite-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={overwrite}
                        onChange={(event) => setOverwrite(event.target.checked)}
                      />
                      <span>{labels.overwriteLabel}</span>
                    </label>
                  ) : null}

                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={assignSelectedPdf}
                    disabled={assignDisabled}
                  >
                    {assigning ? labels.assigningButton : labels.assignButton}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default PdfsPendientes;
