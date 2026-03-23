import { useMemo, useState } from 'react';
import { formatDate } from '../../utils/formatters.js';
import SectionCard from '../common/SectionCard.jsx';
import EmptyState from '../common/EmptyState.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { estadoClassTramite } from '../../utils/estadosTramite.js';
import { openProtectedInNewTab } from '../../utils/protectedResources.js';

const getPdfUrl = (rutaPdf) => (
  rutaPdf ? `/api/files/pdf?path=${encodeURIComponent(rutaPdf)}` : ''
);

function TramiteCaratulasSection({ caratulasProps }) {
  const {
    visible,
    caratula,
    providerGroups,
    orphanGroups,
    permisos,
    readiness,
    onUploadCaratulas,
    onAssignOrphanCaratula,
    onDiscardOrphanCaratula,
    uploadingCaratulas,
    orphanActionId,
    sociedadLabel,
    tramiteEstado,
    providerSortDirection,
    onToggleProviderSortDirection,
    labels
  } = caratulasProps;
  const [selectedFile, setSelectedFile] = useState(null);
  const [orphanAssignments, setOrphanAssignments] = useState({});

  if (!visible) {
    return null;
  }

  const canUpload = permisos?.puedeTesoreria && tramiteEstado === 'en_revision_tesoreria_1';
  const showWaitingMessage = readiness?.showWaitingMessage && !canUpload;
  const missingProviderOptions = useMemo(
    () => providerGroups.filter((group) => group.attachment_status === 'sin_caratula'),
    [providerGroups]
  );

  const handleUpload = async () => {
    const ok = await onUploadCaratulas(selectedFile);
    if (ok) {
      setSelectedFile(null);
    }
  };

  return (
    <SectionCard className="table-card mt-3" title={labels.title}>
      <div className="tramite-caratulas-header">
        <div>
          <div className="fw-semibold">{labels.subtitle}</div>
          <div className="small text-muted">{sociedadLabel}</div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onToggleProviderSortDirection}
          >
            {(labels.providerSortButton || 'Orden proveedor')}: {providerSortDirection === 'desc' ? 'Z-A' : 'A-Z'}
          </button>
          {caratula && (
            <>
              <StatusBadge
                label={caratula.estado === 'procesada' ? labels.resolvedBadge : labels.unresolvedBadge}
                className={caratula.estado === 'procesada' ? 'badge-soft-success' : estadoClassTramite('en_revision_tesoreria_1')}
              />
              <StatusBadge
                label={`${labels.pages}: ${caratula.total_paginas || 0}`}
                className="badge-soft-secondary"
              />
            </>
          )}
        </div>
      </div>

      {canUpload && (
        <div className="tramite-caratulas-upload">
          <div className="small text-muted mb-2">{labels.uploadHint}</div>
          <div className="tramite-caratulas-upload-row">
            <div className="flex-grow-1">
              <label className="form-label small text-muted">{labels.fileInputHelp}</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="form-control"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={uploadingCaratulas}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploadingCaratulas || !selectedFile}
            >
              {uploadingCaratulas
                ? labels.uploading
                : caratula?.nombre_archivo
                  ? labels.replaceButton
                  : labels.uploadButton}
            </button>
          </div>
        </div>
      )}

      {showWaitingMessage && (
        <div className="alert alert-info mb-3">
          <div className="fw-semibold mb-1">
            {readiness.gerenciaPendientes > 0 ? labels.waitingGerencia : labels.waitingGerenciaReady}
          </div>
          <div className="small">
            {labels.waitingSummary}: {readiness.gerenciaAprobados}/{readiness.totalDocumentos} | {labels.waitingPending}: {readiness.gerenciaPendientes} | {labels.waitingRejected}: {readiness.gerenciaRechazados}
          </div>
        </div>
      )}

      {caratula?.nombre_archivo ? (
        <div className="tramite-caratulas-summary">
          <div>
            <div className="small text-muted">{labels.sourceFile}</div>
            <div className="fw-semibold">{caratula.nombre_archivo || '-'}</div>
          </div>
          <div>
            <div className="small text-muted">{labels.executionDate}</div>
            <div>{formatDate(caratula.fecha_ejecucion)}</div>
          </div>
          <div>
            <div className="small text-muted">{labels.strategy}</div>
            <div>{caratula.moneda || '-'}</div>
          </div>
          <div>
            <div className="small text-muted">{labels.linesTitle}</div>
            <div>{providerGroups.length}</div>
          </div>
        </div>
      ) : (
        <EmptyState className="py-2">{labels.noFile}</EmptyState>
      )}

      {Array.isArray(orphanGroups) && orphanGroups.length > 0 && (
        <div className="mt-4">
          <div className="fw-semibold mb-2">{labels.orphansTitle || 'Caratulas huerfanas'}</div>
          <div className="d-flex flex-column gap-3">
            {orphanGroups.map((orphan) => (
              <div key={orphan.orphan_id} className="border rounded p-3">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div>
                    <div className="fw-semibold">{orphan.provider_raw_name || 'Proveedor sin resolver'}</div>
                    <div className="small text-muted">{orphan.provider_raw_identification || '-'}</div>
                    <div className="small text-muted">
                      {labels.pages}: {orphan.page_start || '-'}{orphan.page_end && orphan.page_end !== orphan.page_start ? `-${orphan.page_end}` : ''}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <StatusBadge
                      label={orphan.status}
                      className={orphan.status === 'pendiente' ? 'badge-soft-warning' : 'badge-soft-secondary'}
                    />
                    {orphan.pdf_path && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => openProtectedInNewTab(getPdfUrl(orphan.pdf_path))}
                      >
                        {labels.viewPdfButton || 'Ver PDF'}
                      </button>
                    )}
                  </div>
                </div>
                {Array.isArray(orphan.warnings) && orphan.warnings.length > 0 && (
                  <div className="d-flex flex-column gap-2 mt-3">
                    {orphan.warnings.map((warning) => (
                      <div key={`${orphan.orphan_id}-${warning}`} className="alert alert-warning py-2 px-3 mb-0">
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
                {orphan.status === 'pendiente' && canUpload && (
                  <div className="d-flex flex-wrap gap-2 align-items-end mt-3">
                    <div style={{ minWidth: '280px' }}>
                      <label className="form-label small text-muted mb-1">{labels.orphanAssignLabel || 'Asignar a proveedor faltante'}</label>
                      <select
                        className="form-select"
                        value={orphanAssignments[orphan.orphan_id] || ''}
                        onChange={(event) => setOrphanAssignments((prev) => ({
                          ...prev,
                          [orphan.orphan_id]: event.target.value
                        }))}
                      >
                        <option value="">{labels.providerSelect}</option>
                        {missingProviderOptions.map((group) => (
                          <option key={`${orphan.orphan_id}-${group.provider_key}`} value={group.provider_key}>
                            {group.proveedor_nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled={!orphanAssignments[orphan.orphan_id] || orphanActionId === `assign:${orphan.orphan_id}`}
                      onClick={() => onAssignOrphanCaratula({
                        orphanId: orphan.orphan_id,
                        providerKey: orphanAssignments[orphan.orphan_id]
                      })}
                    >
                      {orphanActionId === `assign:${orphan.orphan_id}`
                        ? (labels.resolving || 'Guardando...')
                        : (labels.assignOrphanButton || 'Adjuntar a proveedor')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      disabled={orphanActionId === `discard:${orphan.orphan_id}`}
                      onClick={() => onDiscardOrphanCaratula({ orphanId: orphan.orphan_id })}
                    >
                      {orphanActionId === `discard:${orphan.orphan_id}`
                        ? (labels.resolving || 'Guardando...')
                        : (labels.discardOrphanButton || 'Desechar')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default TramiteCaratulasSection;
