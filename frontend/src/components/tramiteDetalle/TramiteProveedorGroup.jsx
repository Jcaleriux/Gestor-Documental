import { useMemo, useState } from 'react';
import { formatDate } from '../../utils/formatters.js';
import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import TramiteDocumentoUnificado from '../TramiteDocumentoUnificado.jsx';
import SortableFacturaList from './SortableFacturaList.jsx';
import { useProtectedObjectUrl } from '../../hooks/useProtectedObjectUrl.js';
import { withPdfFitToWidth } from '../../utils/pdfViewer.js';

const getPdfUrl = (rutaPdf) => (
  rutaPdf ? `/api/files/pdf?path=${encodeURIComponent(rutaPdf)}` : ''
);

const buildInitialLineSelections = (group) => Object.fromEntries(
  (group?.lines || []).map((line) => [
    line.line_key,
    line.matched_factura_id ? String(line.matched_factura_id) : '',
  ]),
);

const getAllDocumentIds = (group) => (
  Array.isArray(group?.documents)
    ? group.documents.map((doc) => Number(doc.factura_id))
    : []
);

function TramiteProveedorGroup({
  group,
  labels,
  defaultExpanded = true,
  canManage,
  canResolve,
  onResolveGroup,
  resolving,
  onConfirmOrder,
  confirmingOrder,
  onUploadProviderCaratula,
  uploadingProvider,
  onConfirmProviderCaratula,
  confirmingProvider,
  enEtapaGerencia,
  puedeVerGerencia,
  puedeGerencia,
  puedeGerenciaContable,
  puedeFinanciera,
  puedeTesoreria,
  sociedadId,
  destinosTesoreria,
  tesoreriaDestino,
  onDestinoChange,
  onDecision,
  onAccionTesoreria
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [lineSelections, setLineSelections] = useState(() => buildInitialLineSelections(group));
  const [invoiceOrder, setInvoiceOrder] = useState(() => getAllDocumentIds(group));
  const [expandedDocumentIds, setExpandedDocumentIds] = useState(() => (
    defaultExpanded ? getAllDocumentIds(group) : []
  ));
  const [caratulaExpanded, setCaratulaExpanded] = useState(() => (
    Boolean(group?.pdf_path) && defaultExpanded
  ));
  const [expandAllResources, setExpandAllResources] = useState(Boolean(defaultExpanded));
  const [localError, setLocalError] = useState('');
  const pdfUrl = useMemo(() => getPdfUrl(group.pdf_path), [group.pdf_path]);
  const {
    objectUrl: pdfPreviewUrl,
    loading: pdfPreviewLoading,
    error: pdfPreviewError
  } = useProtectedObjectUrl(pdfUrl);

  const hasMultipleDocs = group.documents.length > 1;
  const showOrderEditor = hasMultipleDocs && canManage && group.order_status !== 'confirmado';
  const showOperationalMetadata = canManage;
  const allDocumentIds = useMemo(() => getAllDocumentIds(group), [group]);
  const allDocumentsExpanded = allDocumentIds.length === 0
    ? true
    : allDocumentIds.every((facturaId) => expandedDocumentIds.includes(facturaId));
  const hasExpandableContent = Boolean(group.pdf_path) || allDocumentIds.length > 0;
  const allProviderPdfsExpanded = (!group.pdf_path || caratulaExpanded) && allDocumentsExpanded;
  const initialInvoiceOrder = useMemo(
    () => group.documents.map((doc) => Number(doc.factura_id)),
    [group.documents]
  );
  const orderChanged = JSON.stringify(invoiceOrder) !== JSON.stringify(initialInvoiceOrder);

  const attachmentBadgeLabel = group.attachment_status === 'confirmada'
    ? (labels.providerAttachmentConfirmed || 'Caratula confirmada')
    : group.attachment_status === 'pendiente_confirmacion'
      ? (labels.providerAttachmentPending || 'Caratula pendiente')
      : (labels.pendingCaratulaBadge || 'Caratula pendiente');

  const attachmentBadgeClass = group.attachment_status === 'confirmada'
    ? 'badge-soft-success'
    : group.attachment_status === 'pendiente_confirmacion'
      ? 'badge-soft-warning'
      : 'badge-soft-secondary';

  const orderBadgeLabel = group.order_status === 'confirmado'
    ? (labels.orderConfirmed || 'Orden confirmado')
    : group.order_status === 'pendiente_confirmacion'
      ? (labels.orderPending || 'Orden pendiente')
      : (labels.orderNotRequired || 'Orden no requerido');

  const orderBadgeClass = group.order_status === 'confirmado'
    ? 'badge-soft-success'
    : group.order_status === 'pendiente_confirmacion'
      ? 'badge-soft-warning'
      : 'badge-soft-secondary';

  const handleResolve = async () => {
    setLocalError('');

    const lineMatches = Object.entries(lineSelections)
      .map(([lineKey, facturaId]) => ({
        line_key: lineKey,
        factura_id: Number(facturaId)
      }))
      .filter((item) => Number.isInteger(item.factura_id) && item.factura_id > 0);

    await onResolveGroup({
      groupKey: group.group_key,
      providerFacturaId: null,
      lineMatches
    });
  };

  const handleConfirmOrder = async () => {
    if (!hasMultipleDocs) {
      return;
    }

    await onConfirmOrder({
      providerKey: group.provider_key || group.group_key,
      facturaIds: invoiceOrder,
      orderSource: orderChanged ? 'manual' : 'auto'
    });
  };

  const handleUploadProvider = async () => {
    if (!selectedFile) {
      setLocalError(labels.fileInputHelp || 'Archivo PDF');
      return;
    }

    const ok = await onUploadProviderCaratula({
      providerKey: group.provider_key || group.group_key,
      file: selectedFile
    });
    if (ok) {
      setSelectedFile(null);
    }
  };

  const toggleExpandedDocument = (facturaId) => {
    setExpandedDocumentIds((prev) => (
      prev.includes(facturaId)
        ? prev.filter((item) => item !== facturaId)
        : [...prev, facturaId]
    ));
  };

  const handleToggleAllProviderPdfs = () => {
    if (!hasExpandableContent) {
      return;
    }

    if (allProviderPdfsExpanded) {
      setCaratulaExpanded(false);
      setExpandedDocumentIds([]);
      setExpandAllResources(false);
      return;
    }

    setCaratulaExpanded(Boolean(group.pdf_path));
    setExpandedDocumentIds(allDocumentIds);
    setExpandAllResources(true);
  };

  return (
    <SectionCard className="tramite-provider-group">
      <div className="tramite-provider-group-header">
        <div>
          <div className="fw-semibold fs-6">
            {group.proveedor_nombre || group.provider_raw_name || 'Proveedor sin asignar'}
          </div>
          <div className="small text-muted">
            {group.proveedor_identificacion || group.provider_raw_identification || '-'}
          </div>
        </div>
        <div className="d-flex flex-column align-items-end gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={handleToggleAllProviderPdfs}
            disabled={!hasExpandableContent}
          >
            {allProviderPdfsExpanded ? 'Colapsar PDFs' : 'Expandir PDFs'}
          </button>
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            {showOperationalMetadata && (
              <StatusBadge label={attachmentBadgeLabel} className={attachmentBadgeClass} />
            )}
            {showOperationalMetadata && (
              <StatusBadge label={orderBadgeLabel} className={orderBadgeClass} />
            )}
            {showOperationalMetadata && (
              <StatusBadge
                label={`${labels.pages}: ${group.page_start || '-'}${group.page_end && group.page_end !== group.page_start ? `-${group.page_end}` : ''}`}
                className="badge-soft-secondary"
              />
            )}
            <StatusBadge
              label={`${labels.executionDate}: ${formatDate(group.execution_date)}`}
              className="badge-soft-secondary"
            />
          </div>
        </div>
      </div>

      {Array.isArray(group.warnings) && group.warnings.length > 0 && (
        <div className="d-flex flex-column gap-2 mb-3">
          {group.warnings.map((warning) => (
            <div key={`${group.group_key}-${warning}`} className="alert alert-warning py-2 px-3 mb-0">
              {warning}
            </div>
          ))}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <div className="tramite-provider-lines-header">
            {showOperationalMetadata && (
              <div>
                <div className="small text-muted">{labels.strategy}</div>
                <div>{group.provider_match_strategy || '-'}</div>
              </div>
            )}
            {showOperationalMetadata && (
              <div>
                <div className="small text-muted">{labels.linesTitle}</div>
                <div>{group.lines.length}</div>
              </div>
            )}
            <div>
              <div className="small text-muted">{labels.documentsTitle}</div>
              <div>{group.documents.length}</div>
            </div>
          </div>

          {showOrderEditor && (
            <div className="mb-3">
              <div className="fw-semibold mb-2">{labels.orderTitle || 'Orden de facturas'}</div>
              <div className="small text-muted mb-2">{labels.orderHint || 'Arrastra las facturas para ajustar el orden antes de confirmarlo.'}</div>
              <SortableFacturaList
                documents={group.documents}
                disabled={!canManage || confirmingOrder}
                onOrderChange={setInvoiceOrder}
              />
              <div className="d-flex justify-content-end mt-3">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleConfirmOrder}
                  disabled={confirmingOrder}
                >
                  {confirmingOrder ? (labels.resolving || 'Guardando...') : (labels.confirmOrderButton || 'Confirmar orden')}
                </button>
              </div>
            </div>
          )}

          {canResolve && group.lines.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Linea</th>
                    <th>Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {group.lines.map((line) => (
                    <tr key={line.line_key}>
                      <td>{line.orden}</td>
                      <td>
                        <div className="fw-semibold">{line.document_raw}</div>
                        {line.warning && <div className="small text-muted">{line.warning}</div>}
                      </td>
                      <td style={{ minWidth: '240px' }}>
                        <select
                          className="form-select form-select-sm"
                          value={lineSelections[line.line_key] || ''}
                          onChange={(event) => setLineSelections((prev) => ({
                            ...prev,
                            [line.line_key]: event.target.value
                          }))}
                          disabled={resolving}
                        >
                          <option value="">{labels.lineSelect}</option>
                          {group.available_documents.map((option) => (
                            <option key={`${line.line_key}-${option.factura_id}`} value={option.factura_id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="d-flex justify-content-end mt-3">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleResolve}
                  disabled={resolving}
                >
                  {resolving ? labels.resolving : labels.resolveButton}
                </button>
              </div>
            </div>
          )}

          {canManage && (
            <div className="border rounded p-3 mt-3">
              <div className="fw-semibold mb-2">{labels.providerAttachmentActions || 'Caratula del proveedor'}</div>
              <div className="small text-muted mb-2">
                {group.attachment_status === 'sin_caratula'
                  ? (labels.providerAttachmentMissingHint || 'Adjunta la caratula del proveedor.')
                  : (labels.providerAttachmentReplaceHint || 'Puedes sustituir la caratula si no coincide con este proveedor.')}
              </div>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="form-control mb-2"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={uploadingProvider}
              />
              {localError && <div className="small text-danger mb-2">{localError}</div>}
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleUploadProvider}
                  disabled={uploadingProvider || !selectedFile}
                >
                  {uploadingProvider
                    ? (labels.uploading || 'Procesando PDF...')
                    : group.attachment_status === 'sin_caratula'
                      ? (labels.attachProviderButton || 'Adjuntar caratula')
                      : (labels.replaceProviderButton || 'Sustituir caratula')}
                </button>
                {group.pdf_path && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onConfirmProviderCaratula({ providerKey: group.provider_key || group.group_key })}
                    disabled={confirmingProvider || !group.can_confirm_attachment}
                  >
                    {confirmingProvider
                      ? (labels.resolving || 'Guardando...')
                      : (labels.confirmProviderButton || 'Confirmar caratula')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="col-12 col-xl-8 tramite-provider-preview-column">
          <div className="border rounded p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
              <div className="fw-semibold">Caratula del proveedor</div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setCaratulaExpanded((prev) => !prev)}
                disabled={!group.pdf_path}
              >
                {caratulaExpanded ? 'Ocultar caratula' : 'Mostrar caratula'}
              </button>
            </div>
            {caratulaExpanded ? (
              pdfPreviewLoading ? (
                <div className="small text-muted">Cargando PDF...</div>
              ) : pdfPreviewUrl ? (
                <iframe
                  title={`Caratula ${group.group_key}`}
                  src={withPdfFitToWidth(pdfPreviewUrl)}
                  className="tramite-provider-preview-frame"
                />
              ) : (
                <EmptyState className="py-2">{pdfPreviewError || labels.pdfUnavailable}</EmptyState>
              )
            ) : (
              <div className="small text-muted border rounded p-3">
                Caratula oculta.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tramite-provider-documents mt-3">
        <div className="fw-semibold mb-3">{labels.documentsTitle}</div>
        <div className="tramite-unificada-list">
          {group.documents.map((doc, index) => (
            <TramiteDocumentoUnificado
              key={`${group.group_key}-${doc.factura_id}`}
              doc={doc}
              pdfUrl={doc.ruta_pdf ? `/api/files/pdf?path=${encodeURIComponent(doc.ruta_pdf)}` : ''}
              sequenceNumber={index + 1}
              expanded={expandedDocumentIds.includes(Number(doc.factura_id))}
              onToggleExpanded={() => toggleExpandedDocument(Number(doc.factura_id))}
              expandAllResources={expandAllResources}
              enEtapaGerencia={enEtapaGerencia}
              puedeVerGerencia={puedeVerGerencia}
              puedeGerencia={puedeGerencia}
              puedeGerenciaContable={puedeGerenciaContable}
              puedeFinanciera={puedeFinanciera}
              puedeTesoreria={puedeTesoreria}
              sociedadId={sociedadId}
              destinosTesoreria={destinosTesoreria}
              destinoSeleccionado={tesoreriaDestino[doc.factura_id]}
              onDestinoChange={onDestinoChange}
              onDecision={onDecision}
              onAccionTesoreria={onAccionTesoreria}
            />
          ))}
          {group.documents.length === 0 && (
            <EmptyState className="py-2">{labels.noGroups}</EmptyState>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export default TramiteProveedorGroup;
