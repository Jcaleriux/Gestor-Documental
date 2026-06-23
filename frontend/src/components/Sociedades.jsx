import { useCallback, useMemo, useState } from 'react';
import { useSociedadesAdmin } from '../hooks/sociedades/useSociedadesAdmin.js';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import LoadingState from './common/LoadingState';
import EmptyState from './common/EmptyState';
import ActionAlerts from './common/ActionAlerts';
import FiltersBar from './common/FiltersBar';
import SearchInput from './common/SearchInput';
import DataTable from './common/DataTable';
import FacturasPagination from './facturas/FacturasPagination';
import { formatDateTime } from '../utils/formatters';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const sociedadesCollator = new Intl.Collator('es', {
  sensitivity: 'base',
  numeric: true,
});

const getSociedadSortValue = (sociedad, sortBy) => {
  switch (sortBy) {
    case 'sociedad':
      return `${sociedad.nombre_proyecto || ''} ${sociedad.razon_social || ''} ${sociedad.codigo || ''}`;
    case 'cedula':
      return sociedad.cedula_juridica || '';
    case 'estado':
      return sociedad.activo === false ? 1 : 0;
    case 'creada': {
      const date = new Date(sociedad.creado_en || 0);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
    default:
      return sociedad.nombre_proyecto || sociedad.razon_social || '';
  }
};

const sortSociedades = (items, sortBy, sortDir) => {
  const direction = sortDir === 'desc' ? -1 : 1;

  return [...items].sort((left, right) => {
    const leftValue = getSociedadSortValue(left, sortBy);
    const rightValue = getSociedadSortValue(right, sortBy);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : sociedadesCollator.compare(String(leftValue), String(rightValue));

    if (result !== 0) {
      return result * direction;
    }

    return Number(left.id || 0) - Number(right.id || 0);
  });
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

function SociedadesSummaryCards({ total, page, totalPages, sociedades }) {
  const activas = sociedades.filter((sociedad) => sociedad.activo !== false).length;
  const inactivas = sociedades.length - activas;
  const conCodigo = sociedades.filter((sociedad) => String(sociedad.codigo || '').trim()).length;

  return (
    <div className="facturas-summary-grid sociedades-summary-grid">
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Resultados</span>
        <strong className="facturas-summary-value">{total} sociedades</strong>
        <span className="facturas-summary-meta">
          {totalPages > 0 ? `Página ${page} de ${totalPages}` : 'Sin resultados'}
        </span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Estado</span>
        <div className="facturas-summary-chip-list">
          <span className="facturas-summary-chip">Activas: {activas}</span>
          <span className="facturas-summary-chip">Inactivas: {inactivas}</span>
        </div>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Identificación</span>
        <strong className="facturas-summary-value">{conCodigo} con código</strong>
        <span className="facturas-summary-meta">Códigos registrados</span>
      </div>
    </div>
  );
}

function SociedadForm({
  form,
  saving,
  onSubmit,
  onFieldChange,
}) {
  return (
    <form id="sociedad-form" className="sociedad-form" onSubmit={onSubmit}>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="sociedad-codigo">Código</label>
          <input
            id="sociedad-codigo"
            className="form-control"
            value={form.codigo}
            maxLength={20}
            disabled={saving}
            onChange={(event) => onFieldChange('codigo', event.target.value.toUpperCase())}
            placeholder="Código interno"
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="sociedad-cedula">Cédula jurídica</label>
          <input
            id="sociedad-cedula"
            className="form-control"
            value={form.cedula_juridica}
            maxLength={20}
            disabled={saving}
            onChange={(event) => onFieldChange('cedula_juridica', event.target.value)}
            required
          />
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="sociedad-nombre">Nombre proyecto</label>
          <input
            id="sociedad-nombre"
            className="form-control"
            value={form.nombre_proyecto}
            maxLength={150}
            disabled={saving}
            onChange={(event) => onFieldChange('nombre_proyecto', event.target.value)}
          />
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="sociedad-razon">Razón social</label>
          <input
            id="sociedad-razon"
            className="form-control"
            value={form.razon_social}
            maxLength={255}
            disabled={saving}
            onChange={(event) => onFieldChange('razon_social', event.target.value)}
            required
          />
        </div>

        <div className="col-12">
          <label className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={form.activo}
              disabled={saving}
              onChange={(event) => onFieldChange('activo', event.target.checked)}
            />
            <span className="form-check-label">Sociedad activa</span>
          </label>
        </div>
      </div>
    </form>
  );
}

function SociedadesTable({
  sociedades,
  saving,
  onEdit,
  onToggleActivo,
  sortBy,
  sortDir,
  onSort,
}) {
  if (sociedades.length === 0) {
    return <EmptyState className="py-4">No hay sociedades para mostrar.</EmptyState>;
  }

  const headers = [
    { key: 'sociedad', label: 'Sociedad', sortable: true, sortKey: 'sociedad' },
    { key: 'cedula', label: 'Cédula jurídica', sortable: true, sortKey: 'cedula' },
    { key: 'estado', label: 'Estado', sortable: true, sortKey: 'estado' },
    { key: 'creada', label: 'Creada', sortable: true, sortKey: 'creada' },
    { key: 'acciones', label: 'Acciones', align: 'end' },
  ];

  return (
    <>
      <DataTable
        className="d-none d-lg-block"
        tableClassName="table table-hover align-middle mb-0 sociedades-data-table"
        headers={headers}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
      >
        {sociedades.map((sociedad) => (
          <tr key={sociedad.id}>
            <td>
              <div className="sociedad-name-cell">
                <span className="sociedad-primary-text">{sociedad.nombre_proyecto || sociedad.razon_social}</span>
                <span className="sociedad-meta-text">
                  {[sociedad.codigo, sociedad.razon_social].filter(Boolean).join(' | ') || '-'}
                </span>
              </div>
            </td>
            <td>{sociedad.cedula_juridica}</td>
            <td>
              <span className={`status-badge ${sociedad.activo === false ? 'badge-soft-secondary' : 'badge-soft-success'}`}>
                {sociedad.activo === false ? 'Inactiva' : 'Activa'}
              </span>
            </td>
            <td>{formatDateTime(sociedad.creado_en)}</td>
            <td className="text-end">
              <div className="sociedades-row-actions">
                <button
                  className="btn btn-outline-primary btn-sm"
                  type="button"
                  onClick={() => onEdit(sociedad)}
                  disabled={saving}
                >
                  Editar
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => onToggleActivo(sociedad)}
                  disabled={saving}
                >
                  {sociedad.activo === false ? 'Activar' : 'Inactivar'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="d-lg-none">
        {sociedades.map((sociedad) => (
          <div className="sociedad-mobile-card" key={sociedad.id}>
            <div className="d-flex justify-content-between gap-3">
              <div className="sociedad-mobile-title">
                <span className="sociedad-primary-text">{sociedad.nombre_proyecto || sociedad.razon_social}</span>
                <span className="sociedad-meta-text">
                  {[sociedad.codigo, sociedad.razon_social].filter(Boolean).join(' | ') || '-'}
                </span>
              </div>
              <span className={`status-badge ${sociedad.activo === false ? 'badge-soft-secondary' : 'badge-soft-success'}`}>
                {sociedad.activo === false ? 'Inactiva' : 'Activa'}
              </span>
            </div>

            <div className="sociedad-mobile-details">
              <div>
                <span className="sociedad-meta-label">Cédula jurídica</span>
                <span>{sociedad.cedula_juridica}</span>
              </div>
              <div>
                <span className="sociedad-meta-label">Creada</span>
                <span>{formatDateTime(sociedad.creado_en)}</span>
              </div>
            </div>

            <div className="sociedades-row-actions">
              <button
                className="btn btn-outline-primary btn-sm"
                type="button"
                onClick={() => onEdit(sociedad)}
                disabled={saving}
              >
                Editar
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => onToggleActivo(sociedad)}
                disabled={saving}
              >
                {sociedad.activo === false ? 'Activar' : 'Inactivar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Sociedades({ onSociedadesChange }) {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('sociedad');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const {
    loading,
    saving,
    editingId,
    isEditing,
    search,
    setSearch,
    form,
    message,
    error,
    filteredSociedades,
    startCreate,
    startEdit,
    resetForm,
    setFormField,
    handleSubmit,
    toggleActivo,
  } = useSociedadesAdmin({ onSociedadesChange });

  const sortedSociedades = useMemo(
    () => sortSociedades(filteredSociedades, sortBy, sortDir),
    [filteredSociedades, sortBy, sortDir]
  );
  const totalPages = Math.ceil(sortedSociedades.length / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pagedSociedades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSociedades.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedSociedades]);
  const visiblePages = useMemo(
    () => buildVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const paginationMeta = useMemo(() => ({
    totalItems: sortedSociedades.length,
    page: totalPages === 0 ? 0 : currentPage,
    totalPages,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
  }), [currentPage, sortedSociedades.length, totalPages]);

  const openCreateModal = useCallback(() => {
    startCreate();
    setFormModalOpen(true);
  }, [startCreate]);

  const openEditModal = useCallback((sociedad) => {
    startEdit(sociedad);
    setFormModalOpen(true);
  }, [startEdit]);

  const closeFormModal = useCallback(() => {
    resetForm();
    setFormModalOpen(false);
  }, [resetForm]);

  const handleSearchChange = useCallback((event) => {
    setSearch(event.target.value);
    setPage(1);
  }, [setSearch]);

  const handleSort = useCallback((nextSortBy, nextSortDir) => {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setPage(1);
  }, []);

  const handleSetPageSize = useCallback((value) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const handleModalSubmit = useCallback(async (event) => {
    const saved = await handleSubmit(event);
    if (saved) {
      setFormModalOpen(false);
    }
  }, [handleSubmit]);

  if (loading) return <LoadingState label="Cargando sociedades..." />;

  return (
    <div className="documents-page facturas-page sociedades-page">
      <PageHeader
        title="Administración de sociedades"
        subtitle="Crea, edita y desactiva las sociedades disponibles en la operación."
        actions={(
          <button className="btn btn-outline-primary" type="button" onClick={openCreateModal}>
            Nueva sociedad
          </button>
        )}
      />

      <ActionAlerts error={error} message={message} />

      <FiltersBar className="facturas-toolbar sociedades-toolbar">
        <SearchInput
          placeholder="Buscar por código, nombre o cédula..."
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

      <SociedadesSummaryCards
        total={filteredSociedades.length}
        page={paginationMeta.page}
        totalPages={totalPages}
        sociedades={filteredSociedades}
      />

      <SectionCard
        className="table-card facturas-table-card sociedades-table-card"
        bodyClassName="p-0"
        title="Sociedades registradas"
      >
        <SociedadesTable
          sociedades={pagedSociedades}
          saving={saving}
          onEdit={openEditModal}
          onToggleActivo={toggleActivo}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
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
          title={isEditing ? `Editar sociedad #${editingId}` : 'Nueva sociedad'}
          onClose={closeFormModal}
          size="modal-lg"
          footer={(
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" form="sociedad-form" disabled={saving}>
                {saving ? 'Guardando...' : (isEditing ? 'Actualizar sociedad' : 'Crear sociedad')}
              </button>
            </>
          )}
        >
          <SociedadForm
            form={form}
            saving={saving}
            onSubmit={handleModalSubmit}
            onFieldChange={setFormField}
          />
        </SimpleModal>
      )}
    </div>
  );
}

export default Sociedades;
