import { Fragment, useState } from 'react';
import { useReservaOperationDetails } from '../hooks/reservas/useReservaOperationDetails.js';
import { useReservasOperations } from '../hooks/reservas/useReservasOperations.js';
import { useProtectedObjectUrl } from '../hooks/useProtectedObjectUrl.js';
import { openProtectedInNewTab } from '../utils/protectedResources.js';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import LoadingState from './common/LoadingState';
import EmptyState from './common/EmptyState';
import ActionAlerts from './common/ActionAlerts';

const CREATE_FORM_INITIAL = {
  proyecto_codigo: '',
  unidad_codigo: '',
  cliente_nombre: '',
  cliente_identificacion: '',
};

const TRANSFER_FORM_INITIAL = {
  destino_sociedad_id: '',
  destino_proyecto_codigo: '',
  destino_unidad_codigo: '',
  cliente_nombre: '',
  cliente_identificacion: '',
  motivo: '',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const inferPreviewType = (doc) => {
  const mimeType = String(doc?.mime_type || '').toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  const raw = `${doc?.nombre_archivo || ''} ${doc?.ruta_archivo || ''}`.toLowerCase();
  if (/\.(jpg|jpeg|png|webp)$/i.test(raw)) return 'image';
  return 'pdf';
};

const resolveSellerName = (operation) => {
  const sellerMeta = operation?.metadata?.vendedor;
  if (sellerMeta && typeof sellerMeta === 'object') {
    const sellerName = String(sellerMeta.nombre || '').trim();
    if (sellerName) {
      return sellerName;
    }
  }

  const legacyName = String(
    operation?.metadata?.vendedor_nombre
      || operation?.metadata?.seller_name
      || '',
  ).trim();
  return legacyName || '-';
};

function ReservaDocumentPreview({ previewType, previewUrl, selectedDoc }) {
  const {
    objectUrl,
    error,
    loading,
  } = useProtectedObjectUrl(previewUrl);

  if (loading) {
    return <div className="small text-muted">Cargando vista previa...</div>;
  }

  if (!objectUrl) {
    return <div className="small text-danger">{error || 'No se pudo cargar la vista previa.'}</div>;
  }

  if (previewType === 'image') {
    return (
      <img
        src={objectUrl}
        alt={selectedDoc.nombre_archivo}
        style={{ width: '100%', maxHeight: '520px', objectFit: 'contain' }}
      />
    );
  }

  return (
    <iframe
      title={`preview-${selectedDoc.id}`}
      src={objectUrl}
      style={{ width: '100%', height: '520px', border: '0' }}
    />
  );
}

function ReservasOperaciones({ sociedadId, canManageDocuments = false }) {
  const [filterEstado, setFilterEstado] = useState('');
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [transferOperationId, setTransferOperationId] = useState(null);
  const [transferForm, setTransferForm] = useState(TRANSFER_FORM_INITIAL);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceReason, setReplaceReason] = useState('');

  const {
    cancelOperation,
    clearFeedback: clearOperationsFeedback,
    closeOperation,
    createOperation,
    error: operationsError,
    loading,
    message: operationsMessage,
    operations,
    refetch,
    saving,
    transferOperation,
  } = useReservasOperations({
    sociedadId,
    estado: filterEstado,
  });

  const {
    buildPreviewUrl,
    clearFeedback: clearDetailsFeedback,
    detailsLoadingId,
    error: detailsError,
    message: detailsMessage,
    openDetailId,
    operationDetails,
    replaceDocument,
    resetState: resetDetailState,
    saving: detailSaving,
    selectDocument,
    selectedDocumentByOperation,
    toggleOperationDetail,
  } = useReservaOperationDetails({
    scopeKey: `${sociedadId || ''}:${filterEstado}`,
  });

  const error = detailsError || operationsError;
  const message = detailsMessage || operationsMessage;
  const isBusy = saving || detailSaving;

  const updateCreateForm = (field) => (event) => {
    const value = event.target.value;
    setCreateForm((previous) => ({ ...previous, [field]: value }));
  };

  const updateTransferForm = (field) => (event) => {
    const value = event.target.value;
    setTransferForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleCreateOperation = async (event) => {
    event.preventDefault();
    if (!sociedadId) {
      return;
    }

    try {
      clearDetailsFeedback();
      await createOperation({
        sociedad_id: Number(sociedadId),
        proyecto_codigo: createForm.proyecto_codigo.trim().toUpperCase(),
        unidad_codigo: createForm.unidad_codigo.trim().toUpperCase(),
        cliente_nombre: createForm.cliente_nombre.trim(),
        cliente_identificacion: createForm.cliente_identificacion.trim() || null,
      });
      setShowCreatePanel(false);
      setCreateForm(CREATE_FORM_INITIAL);
    } catch (error) {
      void error;
    }
  };

  const executeStateAction = async ({ operationId, action }) => {
    const reason = window.prompt('Motivo (opcional):', '') || '';

    try {
      clearDetailsFeedback();
      if (action === 'cancel') {
        await cancelOperation({
          operacionId: operationId,
          motivo: reason || null,
        });
      } else if (action === 'close') {
        await closeOperation({
          operacionId: operationId,
          motivo: reason || null,
        });
      }
      resetDetailState();
      setReplaceFile(null);
      setReplaceReason('');
    } catch (error) {
      void error;
    }
  };

  const startTransfer = (operation) => {
    setTransferOperationId(operation.id);
    setTransferForm({
      destino_sociedad_id: String(operation.sociedad_id || ''),
      destino_proyecto_codigo: String(operation.proyecto_codigo || ''),
      destino_unidad_codigo: '',
      cliente_nombre: String(operation.cliente_nombre || ''),
      cliente_identificacion: String(operation.cliente_identificacion || ''),
      motivo: '',
    });
    clearOperationsFeedback();
    clearDetailsFeedback();
  };

  const submitTransfer = async (event) => {
    event.preventDefault();
    if (!transferOperationId) return;

    try {
      clearDetailsFeedback();
      await transferOperation({
        operacionId: transferOperationId,
        payload: {
          destino_sociedad_id: transferForm.destino_sociedad_id ? Number(transferForm.destino_sociedad_id) : null,
          destino_proyecto_codigo: transferForm.destino_proyecto_codigo.trim().toUpperCase(),
          destino_unidad_codigo: transferForm.destino_unidad_codigo.trim().toUpperCase(),
          cliente_nombre: transferForm.cliente_nombre.trim() || null,
          cliente_identificacion: transferForm.cliente_identificacion.trim() || null,
          motivo: transferForm.motivo.trim() || null,
        },
      });
      setTransferOperationId(null);
      setTransferForm(TRANSFER_FORM_INITIAL);
      resetDetailState();
      setReplaceFile(null);
      setReplaceReason('');
    } catch (error) {
      void error;
    }
  };

  const handleToggleOperationDetail = async (operationId) => {
    setReplaceFile(null);
    setReplaceReason('');
    try {
      await toggleOperationDetail(operationId);
    } catch (error) {
      void error;
    }
  };

  const handleReplaceDocument = async (event, operationId, selectedDoc) => {
    event.preventDefault();
    if (!canManageDocuments || !selectedDoc) {
      return;
    }

    try {
      await replaceDocument({
        operacionId: operationId,
        documentoId: selectedDoc.id,
        file: replaceFile,
        motivo: replaceReason.trim() || null,
      });
      setReplaceFile(null);
      setReplaceReason('');
      await refetch({ showLoader: false }).catch(() => {});
    } catch (error) {
      void error;
    }
  };

  if (!sociedadId) {
    return (
      <div className="container-fluid">
        <EmptyState className="py-2">Seleccione una sociedad para gestionar reservas.</EmptyState>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Cargando reservas..." />;
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title="Reservas"
        subtitle="Gestion de reservas por unidad, con preview y reemplazo de documentos."
      />
      <ActionAlerts error={error} message={message} />

      <SectionCard
        title="Reservas registradas"
        actions={(
          <div className="d-flex gap-2 flex-wrap">
            <select
              className="form-select"
              style={{ minWidth: '220px' }}
              value={filterEstado}
              onChange={(event) => {
                setFilterEstado(event.target.value);
                setTransferOperationId(null);
                setTransferForm(TRANSFER_FORM_INITIAL);
                setReplaceFile(null);
                setReplaceReason('');
              }}
            >
              <option value="">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="cancelada">Cancelada</option>
              <option value="trasladada">Trasladada</option>
              <option value="cerrada">Cerrada</option>
            </select>
            <button
              type="button"
              className={`btn btn-sm ${showCreatePanel ? 'btn-outline-secondary' : 'btn-primary'}`}
              onClick={() => {
                setShowCreatePanel((previous) => !previous);
                clearOperationsFeedback();
                clearDetailsFeedback();
              }}
            >
              {showCreatePanel ? 'Ocultar nueva reserva' : 'Nueva reserva'}
            </button>
          </div>
        )}
      >
        {showCreatePanel && (
          <form className="border rounded-3 p-3 mb-3 bg-body-tertiary" onSubmit={handleCreateOperation}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-2">
                <label className="form-label mb-0">Proyecto
                  <input className="form-control" value={createForm.proyecto_codigo} onChange={updateCreateForm('proyecto_codigo')} required />
                </label>
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label mb-0">Unidad
                  <input className="form-control" value={createForm.unidad_codigo} onChange={updateCreateForm('unidad_codigo')} required />
                </label>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label mb-0">Cliente
                  <input className="form-control" value={createForm.cliente_nombre} onChange={updateCreateForm('cliente_nombre')} required />
                </label>
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label mb-0">Identificacion
                  <input className="form-control" value={createForm.cliente_identificacion} onChange={updateCreateForm('cliente_identificacion')} />
                </label>
              </div>
              <div className="col-12 col-md-2 d-grid">
                <button className="btn btn-primary" type="submit" disabled={isBusy}>{isBusy ? 'Guardando...' : 'Crear'}</button>
              </div>
            </div>
          </form>
        )}

        {operations.length === 0 ? (
          <EmptyState className="py-2">No hay reservas para mostrar.</EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Unidad</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Estado</th>
                  <th>Docs</th>
                  <th>Actualizado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((operation) => {
                  const isActive = operation.estado === 'activa';
                  const isTransferOpen = transferOperationId === operation.id;
                  const isDetailOpen = openDetailId === operation.id;
                  const detail = operationDetails[operation.id] || {};
                  const documents = Array.isArray(detail.documentos) ? detail.documentos : [];
                  const history = Array.isArray(detail.historial) ? detail.historial : [];
                  const selectedId = selectedDocumentByOperation[operation.id];
                  const selectedDoc = documents.find((doc) => doc.id === selectedId) || documents[0] || null;
                  const previewType = inferPreviewType(selectedDoc);
                  const previewUrl = selectedDoc ? buildPreviewUrl({
                    operacionId: operation.id,
                    documentoId: selectedDoc.id,
                  }) : '';

                  return (
                    <Fragment key={operation.id}>
                      <tr>
                        <td>{operation.id}</td>
                        <td>{operation.unidad_codigo}</td>
                        <td><div>{operation.cliente_nombre}</div><div className="text-muted small">{operation.cliente_identificacion || '-'}</div></td>
                        <td>{resolveSellerName(operation)}</td>
                        <td>{operation.estado}</td>
                        <td>{Number(operation.total_documentos || 0)}</td>
                        <td>{formatDateTime(operation.actualizado_en || operation.creado_en)}</td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1 flex-wrap justify-content-end">
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => handleToggleOperationDetail(operation.id)} disabled={detailsLoadingId === operation.id}>
                              {isDetailOpen ? 'Ocultar detalle' : 'Ver detalle'}
                            </button>
                            {isActive && (
                              <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => executeStateAction({ operationId: operation.id, action: 'close' })} disabled={isBusy}>
                                Cerrar
                              </button>
                            )}
                            {isActive && (
                              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => executeStateAction({ operationId: operation.id, action: 'cancel' })} disabled={isBusy}>
                                Cancelar
                              </button>
                            )}
                            {isActive && (
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => startTransfer(operation)} disabled={isBusy}>
                                Trasladar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isDetailOpen && (
                        <tr>
                          <td colSpan={8}>
                            <div className="border rounded-3 p-3 bg-body-tertiary">
                              {detailsLoadingId === operation.id ? (
                                <div className="text-muted small">Cargando detalle...</div>
                              ) : (
                                <div className="row g-3">
                                  <div className="col-12 col-xl-5">
                                    <div className="table-responsive border rounded bg-white">
                                      <table className="table table-sm mb-0">
                                        <thead><tr><th>Codigo</th><th>Archivo</th><th>Actualizado</th></tr></thead>
                                        <tbody>
                                          {documents.map((doc) => (
                                            <tr
                                              key={doc.id}
                                              className={selectedDoc?.id === doc.id ? 'table-primary' : ''}
                                              style={{ cursor: 'pointer' }}
                                              onClick={() => {
                                                selectDocument({ operationId: operation.id, documentoId: doc.id });
                                                setReplaceFile(null);
                                                setReplaceReason('');
                                              }}
                                            >
                                              <td>{doc.codigo_documento}</td>
                                              <td>{doc.nombre_archivo}</td>
                                              <td>{formatDateTime(doc.actualizado_en || doc.creado_en)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="border rounded bg-white p-2 mt-3" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                      {history.length === 0 ? (
                                        <div className="small text-muted">Sin historial.</div>
                                      ) : history.slice(0, 25).map((item) => (
                                        <div key={item.id} className="small border-bottom py-1">
                                          <strong>{item.accion}</strong>
                                          <div className="text-muted">{formatDateTime(item.creado_en)}{item.usuario ? ` | ${item.usuario}` : ''}</div>
                                          {item.motivo && <div className="text-muted">Motivo: {item.motivo}</div>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="col-12 col-xl-7">
                                    {!selectedDoc ? (
                                      <div className="text-muted small">Seleccione un documento para previsualizar.</div>
                                    ) : (
                                      <div className="border rounded bg-white p-2">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <strong>{selectedDoc.nombre_archivo}</strong>
                                          <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => openProtectedInNewTab(previewUrl)}
                                          >
                                            Abrir
                                          </button>
                                        </div>
                                        <ReservaDocumentPreview
                                          previewType={previewType}
                                          previewUrl={previewUrl}
                                          selectedDoc={selectedDoc}
                                        />
                                      </div>
                                    )}

                                    {canManageDocuments && selectedDoc && (
                                      <form className="border rounded p-3 mt-3 bg-white" onSubmit={(event) => handleReplaceDocument(event, operation.id, selectedDoc)}>
                                        <h6 className="mb-2">Reemplazar documento</h6>
                                        <div className="row g-2">
                                          <div className="col-12 col-lg-7">
                                            <input className="form-control" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf" onChange={(event) => setReplaceFile((event.target.files || [])[0] || null)} required />
                                          </div>
                                          <div className="col-12 col-lg-5">
                                            <input className="form-control" value={replaceReason} onChange={(event) => setReplaceReason(event.target.value)} placeholder="Motivo del cambio (opcional)" />
                                          </div>
                                        </div>
                                        <div className="text-end mt-3">
                                          <button type="submit" className="btn btn-primary btn-sm" disabled={isBusy}>{isBusy ? 'Reemplazando...' : 'Guardar reemplazo'}</button>
                                        </div>
                                      </form>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}

                      {isTransferOpen && (
                        <tr>
                          <td colSpan={8}>
                            <form className="border rounded p-3 bg-light-subtle" onSubmit={submitTransfer}>
                              <div className="row g-2">
                                <div className="col-12 col-md-3"><input className="form-control" placeholder="Sociedad destino" value={transferForm.destino_sociedad_id} onChange={updateTransferForm('destino_sociedad_id')} required /></div>
                                <div className="col-12 col-md-3"><input className="form-control" placeholder="Proyecto destino" value={transferForm.destino_proyecto_codigo} onChange={updateTransferForm('destino_proyecto_codigo')} required /></div>
                                <div className="col-12 col-md-3"><input className="form-control" placeholder="Unidad destino" value={transferForm.destino_unidad_codigo} onChange={updateTransferForm('destino_unidad_codigo')} required /></div>
                                <div className="col-12 col-md-3"><input className="form-control" placeholder="Cliente" value={transferForm.cliente_nombre} onChange={updateTransferForm('cliente_nombre')} /></div>
                                <div className="col-12 col-md-4"><input className="form-control" placeholder="Identificacion cliente" value={transferForm.cliente_identificacion} onChange={updateTransferForm('cliente_identificacion')} /></div>
                                <div className="col-12 col-md-8"><input className="form-control" placeholder="Motivo" value={transferForm.motivo} onChange={updateTransferForm('motivo')} /></div>
                              </div>
                              <div className="d-flex gap-2 justify-content-end mt-3">
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setTransferOperationId(null)} disabled={isBusy}>Cancelar</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={isBusy}>{isBusy ? 'Aplicando...' : 'Confirmar traslado'}</button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default ReservasOperaciones;
