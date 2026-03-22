import { useMemo, useState } from 'react';
import { formatAmount, formatDate } from '../../utils/formatters.js';
import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import TramiteDocumentoUnificado from '../TramiteDocumentoUnificado.jsx';
import {
  buildInitialLineSelections,
  buildInitialProviderFacturaId,
  buildScopedGroupStateValue,
  buildTramiteProveedorGroupScope,
} from './tramiteProveedorGroupUiState.js';

function TramiteProveedorGroup({
  group,
  labels,
  pdfPreviewUrl,
  pdfPreviewLoading,
  pdfPreviewError,
  canResolve,
  onResolveGroup,
  resolving,
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
  const groupScope = useMemo(() => buildTramiteProveedorGroupScope(group), [group]);
  const initialProviderFacturaId = useMemo(
    () => buildInitialProviderFacturaId(group),
    [group],
  );
  const initialLineSelections = useMemo(
    () => buildInitialLineSelections(group),
    [group],
  );
  const emptyExpandedDocIds = useMemo(() => new Set(), []);

  const [selectedProviderFacturaIdState, setSelectedProviderFacturaIdState] = useState(() => ({
    scope: groupScope,
    value: initialProviderFacturaId,
  }));
  const [lineSelectionsState, setLineSelectionsState] = useState(() => ({
    scope: groupScope,
    value: initialLineSelections,
  }));
  const [expandedDocIdsState, setExpandedDocIdsState] = useState(() => ({
    scope: groupScope,
    value: emptyExpandedDocIds,
  }));
  const [localErrorState, setLocalErrorState] = useState(() => ({
    scope: groupScope,
    value: '',
  }));

  const selectedProviderFacturaId = buildScopedGroupStateValue({
    scope: groupScope,
    state: selectedProviderFacturaIdState,
    fallback: initialProviderFacturaId,
  });
  const lineSelections = buildScopedGroupStateValue({
    scope: groupScope,
    state: lineSelectionsState,
    fallback: initialLineSelections,
  });
  const expandedDocIds = buildScopedGroupStateValue({
    scope: groupScope,
    state: expandedDocIdsState,
    fallback: emptyExpandedDocIds,
  });
  const localError = buildScopedGroupStateValue({
    scope: groupScope,
    state: localErrorState,
    fallback: '',
  });

  const providerOptions = Array.isArray(group.provider_document_options)
    ? group.provider_document_options
    : [];
  const selectedProviderOption = providerOptions.find(
    (option) => Number(option.factura_id) === Number(selectedProviderFacturaId)
  ) || null;
  const selectedProviderKey = selectedProviderOption?.provider_key || null;

  const lineDocumentOptions = useMemo(() => {
    const availableDocuments = Array.isArray(group.available_documents) ? group.available_documents : [];
    if (!selectedProviderKey) {
      return availableDocuments;
    }
    const filtered = availableDocuments.filter((option) => option.provider_key === selectedProviderKey);
    return filtered.length > 0 ? filtered : availableDocuments;
  }, [group.available_documents, selectedProviderKey]);

  const handleResolve = async () => {
    setLocalErrorState({
      scope: groupScope,
      value: '',
    });
    if (providerOptions.length > 1 && !selectedProviderFacturaId) {
      setLocalErrorState({
        scope: groupScope,
        value: labels.providerSelect,
      });
      return;
    }

    const lineMatches = Object.entries(lineSelections)
      .map(([lineKey, facturaId]) => ({
        line_key: lineKey,
        factura_id: Number(facturaId)
      }))
      .filter((item) => Number.isInteger(item.factura_id) && item.factura_id > 0);

    await onResolveGroup({
      groupKey: group.group_key,
      providerFacturaId: selectedProviderFacturaId ? Number(selectedProviderFacturaId) : null,
      lineMatches
    });
  };

  const toggleExpandedDoc = (facturaId) => {
    setExpandedDocIdsState((previous) => {
      const currentIds = previous.scope === groupScope ? previous.value : emptyExpandedDocIds;
      const next = new Set(currentIds);
      if (next.has(facturaId)) {
        next.delete(facturaId);
      } else {
        next.add(facturaId);
      }
      return {
        scope: groupScope,
        value: next,
      };
    });
  };

  const pageAwarePdfUrl = pdfPreviewUrl && group.pdf_page_start
    ? `${pdfPreviewUrl}#page=${group.pdf_page_start}`
    : pdfPreviewUrl;

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
        <div className="d-flex flex-wrap gap-2">
          <StatusBadge
            label={group.is_blocking ? labels.unresolvedBadge : labels.resolvedBadge}
            className={group.is_blocking ? 'badge-soft-warning' : 'badge-soft-success'}
          />
          <StatusBadge
            label={`${labels.pages}: ${group.page_start || '-'}${group.page_end && group.page_end !== group.page_start ? `-${group.page_end}` : ''}`}
            className="badge-soft-secondary"
          />
          <StatusBadge
            label={`${labels.executionDate}: ${formatDate(group.execution_date)}`}
            className="badge-soft-secondary"
          />
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
        <div className="col-12 col-xl-5">
          {group.page_start && pageAwarePdfUrl ? (
            pdfPreviewLoading ? (
              <div className="small text-muted">Cargando PDF...</div>
            ) : pageAwarePdfUrl ? (
              <iframe
                title={`Caratula ${group.group_key}`}
                src={pageAwarePdfUrl}
                style={{ width: '100%', height: '520px', border: '1px solid #e6ebf2' }}
              />
            ) : (
              <EmptyState className="py-2">{pdfPreviewError || labels.pdfUnavailable}</EmptyState>
            )
          ) : (
            <EmptyState className="py-2">{labels.pdfUnavailable}</EmptyState>
          )}
        </div>

        <div className="col-12 col-xl-7">
          <div className="tramite-provider-lines-header">
            <div>
              <div className="small text-muted">{labels.strategy}</div>
              <div>{group.provider_match_strategy || '-'}</div>
            </div>
            <div>
              <div className="small text-muted">{labels.linesTitle}</div>
              <div>{group.lines.length}</div>
            </div>
            <div>
              <div className="small text-muted">{labels.documentsTitle}</div>
              <div>{group.documents.length}</div>
            </div>
          </div>

          {canResolve && (
            <div className="tramite-provider-resolver">
              <div className="mb-3">
                <label className="form-label small text-muted">{labels.providerTitle}</label>
                <select
                  className="form-select"
                  value={selectedProviderFacturaId}
                  onChange={(event) => setSelectedProviderFacturaIdState({
                    scope: groupScope,
                    value: event.target.value,
                  })}
                  disabled={resolving}
                >
                  <option value="">{labels.providerSelect}</option>
                  {providerOptions.map((option) => (
                    <option key={`${group.group_key}-${option.factura_id}`} value={option.factura_id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {localError && (
                <div className="alert alert-warning py-2 px-3">{localError}</div>
              )}
            </div>
          )}

          {group.lines.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Linea</th>
                    <th>Monto</th>
                    <th>Estado</th>
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
                      <td>{formatAmount(line.monto_total || line.monto_pago || 0)}</td>
                      <td>{line.match_status || '-'}</td>
                      <td style={{ minWidth: '240px' }}>
                        {canResolve ? (
                          <select
                            className="form-select form-select-sm"
                            value={lineSelections[line.line_key] || ''}
                            onChange={(event) => setLineSelectionsState((previous) => ({
                              scope: groupScope,
                              value: {
                                ...(previous.scope === groupScope ? previous.value : initialLineSelections),
                                [line.line_key]: event.target.value
                              },
                            }))}
                            disabled={resolving}
                          >
                            <option value="">{labels.lineSelect}</option>
                            {lineDocumentOptions.map((option) => (
                              <option key={`${line.line_key}-${option.factura_id}`} value={option.factura_id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{line.matched_document_label || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState className="py-2">{labels.noGroups}</EmptyState>
          )}

          {canResolve && (
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
          )}
        </div>
      </div>

      <div className="tramite-provider-documents">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div className="fw-semibold">{labels.documentsTitle}</div>
          {group.documents.length > 1 && (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setExpandedDocIdsState({
                  scope: groupScope,
                  value: new Set(group.documents.map((doc) => Number(doc.factura_id))),
                })}
              >
                Expandir
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setExpandedDocIdsState({
                  scope: groupScope,
                  value: new Set(),
                })}
              >
                Colapsar
              </button>
            </div>
          )}
        </div>

        <div className="tramite-unificada-list">
          {group.documents.map((doc, index) => (
            <TramiteDocumentoUnificado
              key={`${group.group_key}-${doc.factura_id}`}
              doc={doc}
              pdfUrl={doc.ruta_pdf ? `/api/files/pdf?path=${encodeURIComponent(doc.ruta_pdf)}` : ''}
              sequenceNumber={index + 1}
              expanded={expandedDocIds.has(Number(doc.factura_id))}
              onToggleExpanded={() => toggleExpandedDoc(Number(doc.factura_id))}
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
