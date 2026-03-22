import { useState } from 'react';
import { formatDate } from '../../utils/formatters.js';
import SectionCard from '../common/SectionCard.jsx';
import EmptyState from '../common/EmptyState.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { estadoClassTramite } from '../../utils/estadosTramite.js';

function TramiteCaratulasSection({ caratulasProps }) {
  const {
    caratula,
    providerGroups,
    permisos,
    onUploadCaratulas,
    uploadingCaratulas,
    sociedadLabel,
    tramiteEstado,
    labels
  } = caratulasProps;
  const [selectedFile, setSelectedFile] = useState(null);

  const canUpload = permisos?.puedeTesoreria && tramiteEstado === 'en_revision_tesoreria_1';
  const handleUpload = async () => {
    const ok = await onUploadCaratulas(selectedFile);
    if (ok) {
      setSelectedFile(null);
    }
  };

  if (!caratula && !canUpload) {
    return null;
  }

  return (
    <SectionCard className="table-card mt-3" title={labels.title}>
      <div className="tramite-caratulas-header">
        <div>
          <div className="fw-semibold">{labels.subtitle}</div>
          <div className="small text-muted">{sociedadLabel}</div>
        </div>
        {caratula && (
          <div className="d-flex flex-wrap gap-2">
            <StatusBadge
              label={caratula.estado === 'procesada' ? labels.resolvedBadge : labels.unresolvedBadge}
              className={caratula.estado === 'procesada' ? 'badge-soft-success' : estadoClassTramite('en_revision_tesoreria_1')}
            />
            <StatusBadge
              label={`${labels.pages}: ${caratula.total_paginas || 0}`}
              className="badge-soft-secondary"
            />
          </div>
        )}
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
                : caratula
                  ? labels.replaceButton
                  : labels.uploadButton}
            </button>
          </div>
        </div>
      )}

      {caratula ? (
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

      {Array.isArray(caratula?.warnings) && caratula.warnings.length > 0 && (
        <div className="mt-3">
          <div className="small fw-semibold mb-2">{labels.warningsTitle}</div>
          <div className="d-flex flex-column gap-2">
            {caratula.warnings.map((warning) => (
              <div key={warning} className="alert alert-warning py-2 px-3 mb-0">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default TramiteCaratulasSection;
