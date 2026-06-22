import { useCallback, useEffect, useMemo, useState } from 'react';
import { proveedoresApi } from '../services/proveedoresApi';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import LoadingState from './common/LoadingState';
import EmptyState from './common/EmptyState';
import ActionAlerts from './common/ActionAlerts';
import { LOADING_LABELS } from '../utils/uiLabels';

const EMPTY_FORM = {
  identificacion_tipo: '',
  identificacion_numero: '',
  nombre: '',
  nombre_comercial: '',
  correo_electronico: '',
  telefono_codigo_pais: '',
  telefono_numero: ''
};

const PAGE_SIZE_OPTIONS = Object.freeze([25, 50, 100]);

const FIELD_LABELS = Object.freeze({
  identificacion_tipo: 'Tipo identificación',
  identificacion_numero: 'Identificación',
  nombre: 'Nombre',
  nombre_comercial: 'Nombre comercial',
  correo_electronico: 'Correo electrónico',
  telefono_codigo_pais: 'Cod. pais',
  telefono_numero: 'Teléfono'
});

const toFormFromProveedor = (proveedor) => ({
  identificacion_tipo: proveedor.identificacion_tipo || '',
  identificacion_numero: proveedor.identificacion_numero || '',
  nombre: proveedor.nombre || '',
  nombre_comercial: proveedor.nombre_comercial || '',
  correo_electronico: proveedor.correo_electronico || '',
  telefono_codigo_pais: proveedor.telefono_codigo_pais || '',
  telefono_numero: proveedor.telefono_numero || ''
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatValue = (value) => {
  if (value == null || value === '') return '-';
  return String(value);
};

const normalizeSearchText = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
);

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const formatIdentificacion = (value) => {
  const raw = String(value || '').trim();
  const digits = onlyDigits(raw);
  if (/^\d{10}$/.test(digits)) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`;
  }
  if (/^\d{9}$/.test(digits)) {
    return `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`;
  }
  return raw || '-';
};

const formatTelefono = ({ codigoPais, numero }) => {
  const digits = onlyDigits(numero);
  if (!digits) return '-';
  const formattedNumber = digits.length === 8
    ? `${digits.slice(0, 4)}-${digits.slice(4)}`
    : String(numero).trim();
  return codigoPais ? `+${codigoPais} ${formattedNumber}` : formattedNumber;
};

const getPaginationSummary = ({ page, pageSize, total }) => {
  if (total === 0) {
    return 'Mostrando 0 de 0 proveedores';
  }
  const start = ((page - 1) * pageSize) + 1;
  const end = Math.min(page * pageSize, total);
  return `Mostrando ${start}-${end} de ${total} proveedores`;
};

function SimpleModal({ title, children, footer, onClose, size = '' }) {
  return (
    <>
      <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`.trim()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button className="btn-close" type="button" aria-label="Cerrar" onClick={onClose} />
            </div>
            <div className="modal-body">
              {children}
            </div>
            {footer && (
              <div className="modal-footer">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

function Proveedores({ sociedadId }) {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [form, setForm] = useState(EMPTY_FORM);
  const [historialProveedor, setHistorialProveedor] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isEditing = editingId != null;

  const loadProveedores = useCallback(async ({ showLoader = true } = {}) => {
    if (!sociedadId) {
      setProveedores([]);
      if (showLoader) setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const res = await proveedoresApi.listProveedores(sociedadId);
      if (res.data?.success) {
        setProveedores(res.data.data || []);
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar la lista de proveedores.';
      setError(apiError);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [sociedadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset del filtro al cambiar de sociedad
    setSearch('');
    setPage(1);
    loadProveedores();
  }, [sociedadId, loadProveedores]);

  const filteredProveedores = useMemo(() => {
    const term = normalizeSearchText(search.trim());
    const normalizedTerm = onlyDigits(search);
    if (!term) return proveedores;
    return proveedores.filter((proveedor) => (
      normalizeSearchText(`${proveedor.identificacion_tipo} ${proveedor.identificacion_numero} ${proveedor.nombre} ${proveedor.nombre_comercial || ''} ${proveedor.correo_electronico || ''} ${proveedor.telefono_numero || ''}`)
        .includes(term)
        || (normalizedTerm && onlyDigits(proveedor.identificacion_numero).includes(normalizedTerm))
    ));
  }, [proveedores, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProveedores.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProveedores = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProveedores.slice(start, start + pageSize);
  }, [currentPage, filteredProveedores, pageSize]);
  const paginationSummary = getPaginationSummary({
    page: currentPage,
    pageSize,
    total: filteredProveedores.length
  });

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateForm = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormModalOpen(false);
  };

  const startCreate = () => {
    resetForm();
    closeHistorial();
    setFormModalOpen(true);
    setError('');
    setMessage('');
  };

  const startEdit = (proveedor) => {
    closeHistorial();
    setEditingId(proveedor.id);
    setForm(toFormFromProveedor(proveedor));
    setFormModalOpen(true);
    setError('');
    setMessage('');
  };

  const loadHistorial = async (proveedor) => {
    setFormModalOpen(false);
    setHistorialProveedor(proveedor);
    setHistorial([]);
    setHistorialError('');
    setHistorialLoading(true);
    setError('');

    try {
      const res = await proveedoresApi.listProveedorHistorial(proveedor.id);
      if (res.data?.success) {
        setHistorial(res.data.data || []);
      } else {
        setHistorialError('No se pudo cargar el historial del proveedor.');
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar el historial del proveedor.';
      setHistorialError(apiError);
    } finally {
      setHistorialLoading(false);
    }
  };

  const closeHistorial = () => {
    setHistorialProveedor(null);
    setHistorial([]);
    setHistorialError('');
    setHistorialLoading(false);
  };

  const buildPayload = () => ({
    sociedad_id: Number(sociedadId),
    identificacion_tipo: form.identificacion_tipo.trim() || null,
    identificacion_numero: form.identificacion_numero.trim(),
    nombre: form.nombre.trim(),
    nombre_comercial: form.nombre_comercial.trim() || null,
    correo_electronico: form.correo_electronico.trim().toLowerCase() || null,
    telefono_codigo_pais: form.telefono_codigo_pais.trim() || null,
    telefono_numero: form.telefono_numero.trim() || null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sociedadId) {
      setError('Seleccione una sociedad para administrar proveedores.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = buildPayload();
      if (isEditing) {
        await proveedoresApi.updateProveedor(editingId, payload);
        setMessage('Proveedor actualizado correctamente.');
      } else {
        await proveedoresApi.createProveedor(payload);
        setMessage('Proveedor creado correctamente.');
      }

      await loadProveedores({ showLoader: false });
      closeHistorial();
      resetForm();
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar el proveedor.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  };

  if (!sociedadId) {
    return (
      <div className="container-fluid">
        <EmptyState className="py-2">Seleccione una sociedad para administrar proveedores.</EmptyState>
      </div>
    );
  }

  if (loading) return <LoadingState label={LOADING_LABELS.proveedores} />;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Administración de proveedores"
        subtitle="Crea y edita proveedores para la sociedad seleccionada."
        actions={(
          <button className="btn btn-outline-primary" type="button" onClick={startCreate}>
            Nuevo proveedor
          </button>
        )}
      />

      <ActionAlerts error={error} message={message} />

      <div className="row g-3">
        <div className="col-12">
          <SectionCard
            title="Proveedores registrados"
            actions={(
              <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
                <input
                  className="form-control"
                  style={{ minWidth: '280px' }}
                  placeholder="Buscar por identificación, nombre, correo o teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  aria-label="Proveedores por página"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option} por página</option>
                  ))}
                </select>
              </div>
            )}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div className="text-muted small">{paginationSummary}</div>
              {search.trim() && (
                <button className="btn btn-link btn-sm p-0" type="button" onClick={() => setSearch('')}>
                  Limpiar búsqueda
                </button>
              )}
            </div>

            {filteredProveedores.length === 0 ? (
              <EmptyState className="py-2">No hay proveedores para mostrar.</EmptyState>
            ) : (
              <>
                <div className="table-responsive d-none d-lg-block">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Identificación</th>
                        <th>Nombre</th>
                        <th>Contacto</th>
                        <th>Actualizado</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedProveedores.map((proveedor) => (
                        <tr key={proveedor.id}>
                          <td>
                            <div>{formatIdentificacion(proveedor.identificacion_numero)}</div>
                            <span className="badge text-bg-light border">{proveedor.identificacion_tipo || '-'}</span>
                          </td>
                          <td>
                            <div>{proveedor.nombre}</div>
                            <div className="text-muted small">{proveedor.nombre_comercial || '-'}</div>
                          </td>
                          <td>
                            <div>{proveedor.correo_electronico || '-'}</div>
                            <div className="text-muted small">
                              {formatTelefono({
                                codigoPais: proveedor.telefono_codigo_pais,
                                numero: proveedor.telefono_numero
                              })}
                            </div>
                          </td>
                          <td>{formatDate(proveedor.actualizado_en)}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button
                                className={`btn btn-sm ${historialProveedor?.id === proveedor.id ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                type="button"
                                onClick={() => loadHistorial(proveedor)}
                                disabled={saving || historialLoading}
                              >
                                Historial
                              </button>
                              <button
                                className="btn btn-outline-primary btn-sm"
                                type="button"
                                onClick={() => startEdit(proveedor)}
                                disabled={saving}
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-grid gap-2 d-lg-none">
                  {pagedProveedores.map((proveedor) => (
                    <div className="border rounded p-3" key={proveedor.id}>
                      <div className="d-flex justify-content-between gap-2">
                        <div>
                          <div className="fw-semibold">{proveedor.nombre}</div>
                          <div className="text-muted small">{proveedor.nombre_comercial || '-'}</div>
                        </div>
                        <span className="badge text-bg-light border align-self-start">
                          {proveedor.identificacion_tipo || '-'}
                        </span>
                      </div>
                      <div className="row g-2 mt-2 small">
                        <div className="col-12">
                          <span className="text-muted">Identificación: </span>
                          {formatIdentificacion(proveedor.identificacion_numero)}
                        </div>
                        <div className="col-12">
                          <span className="text-muted">Correo: </span>
                          {proveedor.correo_electronico || '-'}
                        </div>
                        <div className="col-12">
                          <span className="text-muted">Teléfono: </span>
                          {formatTelefono({
                            codigoPais: proveedor.telefono_codigo_pais,
                            numero: proveedor.telefono_numero
                          })}
                        </div>
                        <div className="col-12">
                          <span className="text-muted">Actualizado: </span>
                          {formatDate(proveedor.actualizado_en)}
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        <button
                          className={`btn btn-sm flex-fill ${historialProveedor?.id === proveedor.id ? 'btn-secondary' : 'btn-outline-secondary'}`}
                          type="button"
                          onClick={() => loadHistorial(proveedor)}
                          disabled={saving || historialLoading}
                        >
                          Historial
                        </button>
                        <button
                          className="btn btn-outline-primary btn-sm flex-fill"
                          type="button"
                          onClick={() => startEdit(proveedor)}
                          disabled={saving}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
                    <div className="text-muted small">{paginationSummary}</div>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Paginación de proveedores">
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setPage(1)}
                        disabled={currentPage === 1}
                      >
                        Primero
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </button>
                      <button className="btn btn-outline-secondary" type="button" disabled>
                        {currentPage} / {totalPages}
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Último
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </div>
      </div>

      {formModalOpen && (
        <SimpleModal
          title={isEditing ? `Editar proveedor #${editingId}` : 'Nuevo proveedor'}
          onClose={resetForm}
          size="modal-lg"
          footer={(
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={resetForm} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" form="proveedor-form" disabled={saving}>
                {saving ? 'Guardando...' : (isEditing ? 'Actualizar proveedor' : 'Crear proveedor')}
              </button>
            </>
          )}
        >
          <form id="proveedor-form" className="row g-3" onSubmit={handleSubmit}>
            <div className="col-12 col-md-4">
              <label className="form-label mb-0">
                Tipo identificación
                <input
                  className="form-control"
                  value={form.identificacion_tipo}
                  onChange={updateForm('identificacion_tipo')}
                  placeholder="01, 02, 03..."
                />
              </label>
            </div>

            <div className="col-12 col-md-8">
              <label className="form-label mb-0">
                Identificación
                <input
                  className="form-control"
                  value={form.identificacion_numero}
                  onChange={updateForm('identificacion_numero')}
                  required
                />
              </label>
            </div>

            <div className="col-12">
              <label className="form-label mb-0">
                Nombre
                <input
                  className="form-control"
                  value={form.nombre}
                  onChange={updateForm('nombre')}
                  required
                />
              </label>
            </div>

            <div className="col-12">
              <label className="form-label mb-0">
                Nombre comercial
                <input
                  className="form-control"
                  value={form.nombre_comercial}
                  onChange={updateForm('nombre_comercial')}
                />
              </label>
            </div>

            <div className="col-12">
              <label className="form-label mb-0">
                Correo electrónico
                <input
                  className="form-control"
                  type="email"
                  value={form.correo_electronico}
                  onChange={updateForm('correo_electronico')}
                />
              </label>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label mb-0">
                Cod. pais
                <input
                  className="form-control"
                  value={form.telefono_codigo_pais}
                  onChange={updateForm('telefono_codigo_pais')}
                  placeholder="506"
                />
              </label>
            </div>
            <div className="col-12 col-md-8">
              <label className="form-label mb-0">
                Teléfono
                <input
                  className="form-control"
                  value={form.telefono_numero}
                  onChange={updateForm('telefono_numero')}
                />
              </label>
            </div>
          </form>
        </SimpleModal>
      )}

      {historialProveedor && (
        <SimpleModal
          title={`Historial de cambios - ${historialProveedor.nombre}`}
          onClose={closeHistorial}
          size="modal-xl"
          footer={(
            <button className="btn btn-outline-secondary" type="button" onClick={closeHistorial}>
              Cerrar
            </button>
          )}
        >
          <div className="text-muted small mb-3">
            {formatIdentificacion(historialProveedor.identificacion_numero) || 'Sin identificación'}
          </div>

          {historialLoading ? (
            <LoadingState label="Cargando historial de proveedor..." />
          ) : historialError ? (
            <div className="alert alert-warning mb-0">{historialError}</div>
          ) : historial.length === 0 ? (
            <EmptyState className="py-2">Este proveedor no tiene cambios registrados.</EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Campo</th>
                    <th>Anterior</th>
                    <th>Nuevo</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.creado_en)}</td>
                      <td>{FIELD_LABELS[item.campo] || item.campo}</td>
                      <td>{formatValue(item.valor_anterior)}</td>
                      <td>{formatValue(item.valor_nuevo)}</td>
                      <td>{formatValue(item.origen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SimpleModal>
      )}
    </div>
  );
}

export default Proveedores;
