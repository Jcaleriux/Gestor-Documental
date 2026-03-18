import { Fragment, useCallback, useEffect, useState } from 'react';
import { reservasApi } from '../services/reservasApi';
import { getAuthToken } from '../utils/auth';
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

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
  reader.readAsDataURL(file);
});

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

function ReservasOperaciones({ sociedadId, canManageDocuments = false }) {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState(CREATE_FORM_INITIAL);
  const [transferOperationId, setTransferOperationId] = useState(null);
  const [transferForm, setTransferForm] = useState(TRANSFER_FORM_INITIAL);
  const [openDetailId, setOpenDetailId] = useState(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState(null);
  const [operationDetails, setOperationDetails] = useState({});
  const [selectedDocumentByOperation, setSelectedDocumentByOperation] = useState({});
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceReason, setReplaceReason] = useState('');

  const loadOperations = useCallback(async ({ showLoader = true } = {}) => {
    if (!sociedadId) {
      setOperations([]);
      if (showLoader) setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const res = await reservasApi.listOperaciones({
        sociedad_id: sociedadId,
        estado: filterEstado || undefined,
      });
      if (res.data?.success) {
        setOperations(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cargar reservas.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [sociedadId, filterEstado]);

  const loadOperationDetail = useCallback(async (operationId) => {
    setDetailsLoadingId(operationId);
    try {
      const res = await reservasApi.getOperacion(operationId);
      if (res.data?.success) {
        const detail = res.data.data || {};
        setOperationDetails((previous) => ({
          ...previous,
          [operationId]: detail,
        }));

        const docs = Array.isArray(detail.documentos) ? detail.documentos : [];
        if (docs.length > 0) {
          setSelectedDocumentByOperation((previous) => ({
            ...previous,
            [operationId]: previous[operationId] || docs[0].id,
          }));
        }
      }
    } finally {
      setDetailsLoadingId(null);
    }
  }, []);

  useEffect(() => {
    setError('');
    setMessage('');
    setOpenDetailId(null);
    setOperationDetails({});
    setSelectedDocumentByOperation({});
    setReplaceFile(null);
    setReplaceReason('');
    loadOperations();
  }, [loadOperations]);

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
      setError('Seleccione una sociedad para crear reservas.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await reservasApi.createOperacion({
        sociedad_id: Number(sociedadId),
        proyecto_codigo: createForm.proyecto_codigo.trim().toUpperCase(),
        unidad_codigo: createForm.unidad_codigo.trim().toUpperCase(),
        cliente_nombre: createForm.cliente_nombre.trim(),
        cliente_identificacion: createForm.cliente_identificacion.trim() || null,
      });
      setShowCreatePanel(false);
      setCreateForm(CREATE_FORM_INITIAL);
      setMessage('Reserva creada correctamente.');
      await loadOperations({ showLoader: false });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo crear la reserva.');
    } finally {
      setSaving(false);
    }
  };

  const executeStateAction = async ({ operationId, action, successMessage }) => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const reason = window.prompt('Motivo (opcional):', '') || '';
      if (action === 'cancel') {
        await reservasApi.cancelOperacion(operationId, { motivo: reason || null });
      } else if (action === 'close') {
        await reservasApi.closeOperacion(operationId, { motivo: reason || null });
      }
      setMessage(successMessage);
      await loadOperations({ showLoader: false });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo ejecutar la accion.');
    } finally {
      setSaving(false);
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
    setError('');
    setMessage('');
  };

  const submitTransfer = async (event) => {
    event.preventDefault();
    if (!transferOperationId) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');
      await reservasApi.transferOperacion(transferOperationId, {
        destino_sociedad_id: transferForm.destino_sociedad_id ? Number(transferForm.destino_sociedad_id) : null,
        destino_proyecto_codigo: transferForm.destino_proyecto_codigo.trim().toUpperCase(),
        destino_unidad_codigo: transferForm.destino_unidad_codigo.trim().toUpperCase(),
        cliente_nombre: transferForm.cliente_nombre.trim() || null,
        cliente_identificacion: transferForm.cliente_identificacion.trim() || null,
        motivo: transferForm.motivo.trim() || null,
      });
      setTransferOperationId(null);
      setTransferForm(TRANSFER_FORM_INITIAL);
      setMessage('Traslado aplicado correctamente.');
      await loadOperations({ showLoader: false });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo trasladar la reserva.');
    } finally {
      setSaving(false);
    }
  };

  const toggleOperationDetail = async (operationId) => {
    if (openDetailId === operationId) {
      setOpenDetailId(null);
      setReplaceFile(null);
      setReplaceReason('');
      return;
    }

    setOpenDetailId(operationId);
    setReplaceFile(null);
    setReplaceReason('');
    try {
      await loadOperationDetail(operationId);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cargar el detalle de la reserva.');
      setOpenDetailId(null);
    }
  };

  const handleReplaceDocument = async (event, operationId, selectedDoc) => {
    event.preventDefault();
    if (!canManageDocuments) {
      setError('No tiene permisos para reemplazar documentos.');
      return;
    }
    if (!selectedDoc) {
      setError('Seleccione un documento.');
      return;
    }
    if (!replaceFile) {
      setError('Seleccione un archivo PDF o imagen para reemplazar.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      const fileBase64 = await fileToDataUrl(replaceFile);
      await reservasApi.replaceDocumento(operationId, selectedDoc.id, {
        filename: replaceFile.name,
        file_base64: fileBase64,
        mime_type: replaceFile.type || null,
        motivo: replaceReason.trim() || null,
      });
      setReplaceFile(null);
      setReplaceReason('');
      setMessage('Documento reemplazado correctamente. Se registro en historial.');
      await Promise.all([
        loadOperationDetail(operationId),
        loadOperations({ showLoader: false }),
      ]);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo reemplazar el documento.');
    } finally {
      setSaving(false);
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
              onChange={(event) => setFilterEstado(event.target.value)}
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
              onClick={() => setShowCreatePanel((previous) => !previous)}
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
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</button>
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
                  const previewUrl = selectedDoc ? reservasApi.buildPreviewDocumentoUrl({
                    operacionId: operation.id,
                    documentoId: selectedDoc.id,
                    token: getAuthToken(),
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
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => toggleOperationDetail(operation.id)} disabled={detailsLoadingId === operation.id}>
                              {isDetailOpen ? 'Ocultar detalle' : 'Ver detalle'}
                            </button>
                            {isActive && (
                              <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => executeStateAction({ operationId: operation.id, action: 'close', successMessage: 'Reserva cerrada correctamente.' })} disabled={saving}>
                                Cerrar
                              </button>
                            )}
                            {isActive && (
                              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => executeStateAction({ operationId: operation.id, action: 'cancel', successMessage: 'Reserva cancelada correctamente.' })} disabled={saving}>
                                Cancelar
                              </button>
                            )}
                            {isActive && (
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => startTransfer(operation)} disabled={saving}>
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
                                                setSelectedDocumentByOperation((previous) => ({ ...previous, [operation.id]: doc.id }));
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
                                          <div className="text-muted">{formatDateTime(item.creado_en)}{item.usuario ? ` Â· ${item.usuario}` : ''}</div>
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
                                          <a className="btn btn-outline-secondary btn-sm" href={previewUrl} target="_blank" rel="noreferrer">Abrir</a>
                                        </div>
                                        {previewType === 'image' ? (
                                          <img src={previewUrl} alt={selectedDoc.nombre_archivo} style={{ width: '100%', maxHeight: '520px', objectFit: 'contain' }} />
                                        ) : (
                                          <iframe title={`preview-${selectedDoc.id}`} src={previewUrl} style={{ width: '100%', height: '520px', border: '0' }} />
                                        )}
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
                                          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Reemplazando...' : 'Guardar reemplazo'}</button>
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
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setTransferOperationId(null)} disabled={saving}>Cancelar</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Aplicando...' : 'Confirmar traslado'}</button>
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

















