import { useCallback, useEffect, useMemo, useState } from 'react';
import { proveedoresApi } from '../services/proveedoresApi';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import LoadingState from './common/LoadingState';
import EmptyState from './common/EmptyState';
import ActionAlerts from './common/ActionAlerts';
import DataTable from './common/DataTable';
import FiltersBar from './common/FiltersBar';
import SearchInput from './common/SearchInput';
import FacturasPagination from './facturas/FacturasPagination';
import { LOADING_LABELS } from '../utils/uiLabels';
import { formatDateTime } from '../utils/formatters';

const EMPTY_FORM = {
  identificacion_tipo: '',
  identificacion_numero: '',
  nombre: '',
  nombre_comercial: '',
  correo_electronico: '',
  telefono_codigo_pais: '',
  telefono_numero: ''
};

const PROVEEDORES_TABLE_HEADERS = Object.freeze([
  {
    key: 'identificacion',
    label: 'Identificación',
    sortable: true,
    sortKey: 'identificacion'
  },
  {
    key: 'nombre',
    label: 'Nombre',
    sortable: true,
    sortKey: 'nombre'
  },
  {
    key: 'contacto',
    label: 'Contacto',
    sortable: true,
    sortKey: 'contacto'
  },
  {
    key: 'actualizado',
    label: 'Actualizado',
    sortable: true,
    sortKey: 'actualizado'
  },
  { key: 'acciones', label: 'ACCIONES', align: 'end' }
]);

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

const proveedorCollator = new Intl.Collator('es', {
  sensitivity: 'base',
  numeric: true
});

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

const buildVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 0) return [];

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  const sortedPages = Array.from(pages)
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
    .sort((a, b) => a - b);

  return sortedPages.reduce((visiblePages, pageNumber, index) => {
    if (index > 0 && pageNumber - sortedPages[index - 1] > 1) {
      visiblePages.push(`ellipsis-${pageNumber}`);
    }
    visiblePages.push(pageNumber);
    return visiblePages;
  }, []);
};

const getProveedorSortValue = (proveedor, sortBy) => {
  switch (sortBy) {
    case 'identificacion':
      return onlyDigits(proveedor.identificacion_numero) || proveedor.identificacion_numero || '';
    case 'nombre':
      return `${proveedor.nombre || ''} ${proveedor.nombre_comercial || ''}`;
    case 'contacto':
      return `${proveedor.correo_electronico || ''} ${proveedor.telefono_numero || ''}`;
    case 'actualizado': {
      const date = new Date(proveedor.actualizado_en || 0);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
    default:
      return proveedor.nombre || '';
  }
};

const sortProveedores = (items, sortBy, sortDir) => {
  const direction = sortDir === 'desc' ? -1 : 1;
  return [...items].sort((left, right) => {
    const leftValue = getProveedorSortValue(left, sortBy);
    const rightValue = getProveedorSortValue(right, sortBy);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : proveedorCollator.compare(String(leftValue), String(rightValue));

    if (result !== 0) {
      return result * direction;
    }

    return Number(left.id || 0) - Number(right.id || 0);
  });
};

function ProveedoresSummaryCards({ total, page, totalPages, proveedores }) {
  const activos = proveedores.filter((proveedor) => proveedor.activo !== false).length;
  const inactivos = proveedores.length - activos;

  return (
    <div className="facturas-summary-grid proveedores-summary-grid">
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Resultados</span>
        <strong className="facturas-summary-value">{total} resultados</strong>
        <span className="facturas-summary-meta">
          {totalPages > 0 ? `Página ${page} de ${totalPages}` : 'Sin resultados'}
        </span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Estado</span>
        <div className="facturas-summary-chip-list">
          <span className="facturas-summary-chip">Activos: {activos}</span>
          <span className="facturas-summary-chip">Inactivos: {inactivos}</span>
        </div>
      </div>
    </div>
  );
}

function ProveedoresTable({
  proveedores,
  saving,
  historialLoading,
  historialProveedor,
  onLoadHistorial,
  onEdit,
  sortBy,
  sortDir,
  onSort
}) {
  return (
    <DataTable
      headers={PROVEEDORES_TABLE_HEADERS}
      stickyHeader
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      className="d-none d-lg-block"
      tableClassName="table table-hover align-middle mb-0 facturas-data-table proveedores-data-table"
    >
      {proveedores.map((proveedor) => (
        <tr key={proveedor.id}>
          <td>
            <div className="proveedor-identificacion-cell">
              <div className="proveedor-primary-text">{formatIdentificacion(proveedor.identificacion_numero)}</div>
              <div className="proveedor-meta-text">Tipo: {proveedor.identificacion_tipo || '-'}</div>
            </div>
          </td>
          <td>
            <div className="proveedor-nombre-cell" title={proveedor.nombre}>
              <div className="proveedor-primary-text">{proveedor.nombre}</div>
              <div className="proveedor-meta-text">{proveedor.nombre_comercial || '-'}</div>
            </div>
          </td>
          <td>
            <div className="proveedor-contacto-cell">
              <div className="proveedor-primary-text">{proveedor.correo_electronico || '-'}</div>
              <div className="proveedor-meta-text">
                {formatTelefono({
                  codigoPais: proveedor.telefono_codigo_pais,
                  numero: proveedor.telefono_numero
                })}
              </div>
            </div>
          </td>
          <td>{formatDateTime(proveedor.actualizado_en)}</td>
          <td className="text-end">
            <div className="proveedor-actions">
              <button
                className={`btn btn-sm ${historialProveedor?.id === proveedor.id ? 'btn-secondary' : 'btn-outline-secondary'}`}
                type="button"
                onClick={() => onLoadHistorial(proveedor)}
                disabled={saving || historialLoading}
              >
                Historial
              </button>
              <button
                className="btn btn-outline-primary btn-sm"
                type="button"
                onClick={() => onEdit(proveedor)}
                disabled={saving}
              >
                Editar
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function ProveedoresMobileCards({
  proveedores,
  saving,
  historialLoading,
  historialProveedor,
  onLoadHistorial,
  onEdit
}) {
  return (
    <div className="proveedores-mobile-list d-grid gap-2 d-lg-none">
      {proveedores.map((proveedor) => (
        <div className="proveedor-mobile-card" key={proveedor.id}>
          <div className="d-flex justify-content-between gap-2">
            <div className="proveedor-mobile-title">
              <div className="proveedor-primary-text">{proveedor.nombre}</div>
              <div className="proveedor-meta-text">{proveedor.nombre_comercial || '-'}</div>
            </div>
            <span className="facturas-summary-chip align-self-start">
              Tipo: {proveedor.identificacion_tipo || '-'}
            </span>
          </div>
          <div className="proveedor-mobile-details">
            <div>
              <span className="proveedor-meta-label">Identificación</span>
              <span>{formatIdentificacion(proveedor.identificacion_numero)}</span>
            </div>
            <div>
              <span className="proveedor-meta-label">Correo</span>
              <span>{proveedor.correo_electronico || '-'}</span>
            </div>
            <div>
              <span className="proveedor-meta-label">Teléfono</span>
              <span>
                {formatTelefono({
                  codigoPais: proveedor.telefono_codigo_pais,
                  numero: proveedor.telefono_numero
                })}
              </span>
            </div>
            <div>
              <span className="proveedor-meta-label">Actualizado</span>
              <span>{formatDateTime(proveedor.actualizado_en)}</span>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              className={`btn btn-sm flex-fill ${historialProveedor?.id === proveedor.id ? 'btn-secondary' : 'btn-outline-secondary'}`}
              type="button"
              onClick={() => onLoadHistorial(proveedor)}
              disabled={saving || historialLoading}
            >
              Historial
            </button>
            <button
              className="btn btn-outline-primary btn-sm flex-fill"
              type="button"
              onClick={() => onEdit(proveedor)}
              disabled={saving}
            >
              Editar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
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
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
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

  const sortedProveedores = useMemo(
    () => sortProveedores(filteredProveedores, sortBy, sortDir),
    [filteredProveedores, sortBy, sortDir]
  );
  const totalPages = Math.ceil(sortedProveedores.length / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pagedProveedores = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProveedores.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedProveedores]);
  const paginationMeta = useMemo(() => ({
    totalItems: sortedProveedores.length,
    page: totalPages === 0 ? 0 : currentPage,
    totalPages,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages
  }), [currentPage, sortedProveedores.length, totalPages]);
  const visiblePages = useMemo(
    () => buildVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);
  const handleSetPageSize = useCallback((value) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);
  const handleSort = useCallback((nextSortBy, nextSortDir) => {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setPage(1);
  }, []);

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
      <div className="documents-page">
        <EmptyState className="py-2">Seleccione una sociedad para administrar proveedores.</EmptyState>
      </div>
    );
  }

  if (loading) return <LoadingState label={LOADING_LABELS.proveedores} />;

  return (
    <div className="documents-page facturas-page proveedores-page">
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

      <FiltersBar className="facturas-toolbar">
        <SearchInput
          placeholder="Buscar por identificación, nombre, correo o teléfono..."
          value={search}
          onChange={handleSearchChange}
        />
        {search.trim() ? (
          <div className="facturas-toolbar-actions">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : null}
      </FiltersBar>

      <ProveedoresSummaryCards
        total={filteredProveedores.length}
        page={paginationMeta.page}
        totalPages={totalPages}
        proveedores={filteredProveedores}
      />

      <SectionCard className="table-card facturas-table-card" bodyClassName="p-0">
        {filteredProveedores.length === 0 ? (
          <div className="py-4">
            <EmptyState className="text-center py-2">No hay proveedores para mostrar.</EmptyState>
          </div>
        ) : (
          <>
            <ProveedoresTable
              proveedores={pagedProveedores}
              saving={saving}
              historialLoading={historialLoading}
              historialProveedor={historialProveedor}
              onLoadHistorial={loadHistorial}
              onEdit={startEdit}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
            />

            <ProveedoresMobileCards
              proveedores={pagedProveedores}
              saving={saving}
              historialLoading={historialLoading}
              historialProveedor={historialProveedor}
              onLoadHistorial={loadHistorial}
              onEdit={startEdit}
            />
          </>
        )}
      </SectionCard>

      {totalPages > 1 ? (
        <FacturasPagination
          meta={paginationMeta}
          pageSize={pageSize}
          pages={visiblePages}
          setPage={setPage}
          setPageSize={handleSetPageSize}
        />
      ) : null}

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
                      <td>{formatDateTime(item.creado_en)}</td>
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
