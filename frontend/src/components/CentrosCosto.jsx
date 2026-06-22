import { useCallback, useMemo, useRef, useState } from 'react';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import ActionAlerts from './common/ActionAlerts';
import SearchInput from './common/SearchInput';
import DataTable from './common/DataTable';
import FiltersBar from './common/FiltersBar';
import FacturasPagination from './facturas/FacturasPagination';
import { useCentrosCostoCatalog } from '../hooks/centrosCosto/useCentrosCostoCatalog.js';
import { formatDate } from '../utils/formatters.js';
import {
  ROOT_PARENT_CODE,
  formatCentroCostoLabel,
  getCentroCostoAprobadorDetalle,
  getCentroCostoAprobadorNombre,
} from '../utils/centrosCosto.js';

const TABLE_HEADERS = Object.freeze([
  { key: 'codigo', label: 'Código', sortable: true, sortKey: 'codigo' },
  { key: 'nombre', label: 'Nombre', sortable: true, sortKey: 'nombre' },
  { key: 'padre', label: 'Centro padre', sortable: true, sortKey: 'padre' },
  { key: 'aprobador', label: 'Aprobador', sortable: true, sortKey: 'aprobador' },
  { key: 'uso', label: 'Uso', sortable: true, sortKey: 'uso' },
  { key: 'estado', label: 'Estado', sortable: true, sortKey: 'estado' },
  { key: 'actualizado', label: 'Actualizado', sortable: true, sortKey: 'actualizado' },
  { key: 'acciones', label: 'ACCIONES', align: 'end' },
]);

const centroCollator = new Intl.Collator('es', {
  sensitivity: 'base',
  numeric: true,
});

const getCentroSortValue = (centro, sortBy) => {
  switch (sortBy) {
    case 'codigo':
      return centro.codigo || '';
    case 'nombre':
      return centro.nombre || '';
    case 'padre':
      return centro.centro_padre_codigo || '';
    case 'aprobador':
      return getCentroCostoAprobadorNombre(centro) || '';
    case 'uso':
      return centro.seleccionable_en_contabilizacion === false ? 1 : 0;
    case 'estado':
      return centro.activo === false ? 1 : 0;
    case 'actualizado': {
      const date = new Date(centro.actualizado_en || 0);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
    default:
      return centro.codigo || '';
  }
};

const sortCentrosCosto = (items, sortBy, sortDir) => {
  const direction = sortDir === 'desc' ? -1 : 1;

  return [...items].sort((left, right) => {
    const leftValue = getCentroSortValue(left, sortBy);
    const rightValue = getCentroSortValue(right, sortBy);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : centroCollator.compare(String(leftValue), String(rightValue));

    if (result !== 0) {
      return result * direction;
    }

    return centroCollator.compare(String(left.codigo || ''), String(right.codigo || ''));
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

function ImportSummary({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="alert alert-warning">
      <div className="fw-semibold">Importación: {summary.filename}</div>
      <div className="small mt-1">
        Creados: {summary.created} | Actualizados: {summary.updated} | Omitidos: {summary.skipped || 0}
      </div>
      {summary.warnings?.length > 0 ? (
        <div className="small mt-2">
          {summary.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CentroBadges({ centro }) {
  return (
    <div className="centros-costo-badges">
      <span className={`status-badge ${centro.activo === false ? 'badge-soft-secondary' : 'badge-soft-success'}`}>
        {centro.activo === false ? 'Inactivo' : 'Activo'}
      </span>
      <span className={`status-badge ${centro.seleccionable_en_contabilizacion === false ? 'badge-soft-warning' : 'badge-soft-primary'}`}>
        {centro.seleccionable_en_contabilizacion === false ? 'Solo agrupador' : 'Seleccionable'}
      </span>
    </div>
  );
}

function CentrosCostoSummaryCards({ stats, filteredCount, currentPage, totalPages, treeCount, onOpenTree }) {
  return (
    <div className="facturas-summary-grid centros-costo-summary-grid">
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Resultados</span>
        <strong className="facturas-summary-value">{filteredCount} centros</strong>
        <span className="facturas-summary-meta">
          {totalPages > 0 ? `Página ${currentPage} de ${totalPages}` : 'Sin resultados'}
        </span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Estado</span>
        <div className="facturas-summary-chip-list">
          <span className="facturas-summary-chip">Activos: {stats.activos}</span>
          <span className="facturas-summary-chip">Inactivos: {stats.inactivos}</span>
        </div>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Uso contable</span>
        <strong className="facturas-summary-value">{stats.seleccionables} seleccionables</strong>
        <span className="facturas-summary-meta">Disponibles para contabilización</span>
      </div>
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Jerarquía</span>
        <strong className="facturas-summary-value">{treeCount} raíces visibles</strong>
        <button className="btn btn-outline-primary btn-sm centros-costo-card-action" type="button" onClick={onOpenTree}>
          Ver jerarquía
        </button>
      </div>
    </div>
  );
}

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

function CentroTreeNode({ node, onEdit, onToggleActive, saving }) {
  return (
    <li className="centros-costo-tree-item">
      <div className="centros-costo-tree-row">
        <div className="centros-costo-tree-copy">
          <div className="centros-costo-tree-title">{formatCentroCostoLabel(node)}</div>
          <div className="centros-costo-tree-meta">
            {getCentroCostoAprobadorNombre(node) || 'Sin aprobador asignado'}
          </div>
          <CentroBadges centro={node} />
        </div>

        <div className="centros-costo-tree-actions">
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={() => onEdit(node)}
            disabled={saving}
          >
            Editar
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={() => onToggleActive(node)}
            disabled={saving}
          >
            {node.activo === false ? 'Activar' : 'Inactivar'}
          </button>
        </div>
      </div>

      {node.children?.length > 0 ? (
        <ul className="centros-costo-tree-list">
          {node.children.map((child) => (
            <CentroTreeNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              saving={saving}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CentrosCostoTable({
  centros,
  saving,
  onEdit,
  onToggleActive,
  sortBy,
  sortDir,
  onSort,
}) {
  return (
    <DataTable
      headers={TABLE_HEADERS}
      stickyHeader
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      className="d-none d-lg-block"
      tableClassName="table table-hover align-middle mb-0 facturas-data-table centros-costo-data-table"
    >
      {centros.map((centro) => (
        <tr key={centro.id}>
          <td>
            <div className="centro-costo-code-cell">
              <div className="centro-costo-primary-text">{centro.codigo}</div>
              <div className="centro-costo-meta-text">Orden: {centro.orden || '-'}</div>
            </div>
          </td>
          <td>
            <div className="centro-costo-name-cell" title={centro.nombre}>
              <div className="centro-costo-primary-text">{centro.nombre}</div>
              <div className="centro-costo-meta-text">
                {centro.seleccionable_en_contabilizacion === false ? 'Centro agrupador' : 'Seleccionable'}
              </div>
            </div>
          </td>
          <td>{centro.centro_padre_codigo || 'Raíz'}</td>
          <td>
            <div className="centro-costo-approver-cell">
              <div className="centro-costo-primary-text">{getCentroCostoAprobadorNombre(centro) || '-'}</div>
              <div className="centro-costo-meta-text">{getCentroCostoAprobadorDetalle(centro) || 'Sin detalle'}</div>
            </div>
          </td>
          <td>
            <span className={`status-badge ${centro.seleccionable_en_contabilizacion === false ? 'badge-soft-warning' : 'badge-soft-primary'}`}>
              {centro.seleccionable_en_contabilizacion === false ? 'Agrupador' : 'Seleccionable'}
            </span>
          </td>
          <td>
            <span className={`status-badge ${centro.activo === false ? 'badge-soft-secondary' : 'badge-soft-success'}`}>
              {centro.activo === false ? 'Inactivo' : 'Activo'}
            </span>
          </td>
          <td>{formatDate(centro.actualizado_en)}</td>
          <td className="text-end">
            <div className="centros-costo-row-actions">
              <button
                className="btn btn-outline-primary btn-sm"
                type="button"
                onClick={() => onEdit(centro)}
                disabled={saving}
              >
                Editar
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => onToggleActive(centro)}
                disabled={saving}
              >
                {centro.activo === false ? 'Activar' : 'Inactivar'}
              </button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function CentrosCostoMobileCards({ centros, saving, onEdit, onToggleActive }) {
  return (
    <div className="centros-costo-mobile-list d-grid gap-2 d-lg-none">
      {centros.map((centro) => (
        <div className="centro-costo-mobile-card" key={centro.id}>
          <div className="d-flex justify-content-between gap-2">
            <div className="centro-costo-mobile-title">
              <div className="centro-costo-primary-text">{centro.codigo} - {centro.nombre}</div>
              <div className="centro-costo-meta-text">Padre: {centro.centro_padre_codigo || 'Raíz'}</div>
            </div>
            <CentroBadges centro={centro} />
          </div>
          <div className="centro-costo-mobile-details">
            <div>
              <span className="centro-costo-meta-label">Aprobador</span>
              <span>{getCentroCostoAprobadorNombre(centro) || '-'}</span>
            </div>
            <div>
              <span className="centro-costo-meta-label">Detalle</span>
              <span>{getCentroCostoAprobadorDetalle(centro) || 'Sin detalle'}</span>
            </div>
            <div>
              <span className="centro-costo-meta-label">Actualizado</span>
              <span>{formatDate(centro.actualizado_en)}</span>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              className="btn btn-outline-primary btn-sm flex-fill"
              type="button"
              onClick={() => onEdit(centro)}
              disabled={saving}
            >
              Editar
            </button>
            <button
              className="btn btn-outline-secondary btn-sm flex-fill"
              type="button"
              onClick={() => onToggleActive(centro)}
              disabled={saving}
            >
              {centro.activo === false ? 'Activar' : 'Inactivar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CentrosCostoForm({
  form,
  editing,
  saving,
  selectedParentLabel,
  suggestedParent,
  parentOptions,
  roles,
  usuarios,
  onFieldChange,
  onSubmit,
}) {
  return (
    <form id="centro-costo-form" className="row g-3" onSubmit={onSubmit}>
      <div className="col-12 col-md-4">
        <label className="form-label mb-0">
          Código
          <input
            className="form-control"
            value={form.codigo}
            onChange={(event) => onFieldChange('codigo', event.target.value.toUpperCase())}
            required
            disabled={saving}
          />
        </label>
      </div>

      <div className="col-12 col-md-8">
        <label className="form-label mb-0">
          Nombre
          <input
            className="form-control"
            value={form.nombre}
            onChange={(event) => onFieldChange('nombre', event.target.value)}
            required
            disabled={saving}
          />
        </label>
      </div>

      <div className="col-12">
        <label className="form-label mb-0">
          Centro padre
          <select
            className="form-select"
            value={form.centro_padre_id}
            onChange={(event) => onFieldChange('centro_padre_id', event.target.value)}
            required
            disabled={saving}
          >
            <option value={ROOT_PARENT_CODE}>Raíz de la sociedad</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.codigo} - {option.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {suggestedParent && String(suggestedParent.id) !== String(form.centro_padre_id) ? (
        <div className="col-12">
          <div className="cc-config-note">
            Sugerencia por código: <strong>{suggestedParent.codigo}</strong> - {suggestedParent.nombre}{' '}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 align-baseline"
              onClick={() => onFieldChange('centro_padre_id', String(suggestedParent.id))}
              disabled={saving}
            >
              Usar sugerido
            </button>
          </div>
        </div>
      ) : null}

      <div className="col-12 col-md-5">
        <label className="form-label mb-0">
          Tipo de aprobador
          <select
            className="form-select"
            value={form.aprobador_tipo}
            onChange={(event) => onFieldChange('aprobador_tipo', event.target.value)}
            disabled={saving}
          >
            <option value="usuario">Usuario específico</option>
            <option value="rol">Rol compartido</option>
          </select>
        </label>
      </div>

      {form.aprobador_tipo === 'rol' ? (
        <div className="col-12 col-md-7">
          <label className="form-label mb-0">
            Rol aprobador
            <select
              className="form-select"
              value={form.rol_aprobador_id}
              onChange={(event) => onFieldChange('rol_aprobador_id', event.target.value)}
              required
              disabled={saving}
            >
              <option value="">Seleccionar rol</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre} ({rol.codigo})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="col-12 col-md-7">
          <label className="form-label mb-0">
            Usuario aprobador
            <select
              className="form-select"
              value={form.usuario_aprobador_id}
              onChange={(event) => onFieldChange('usuario_aprobador_id', event.target.value)}
              required
              disabled={saving}
            >
              <option value="">Seleccionar aprobador</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} ({usuario.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="col-12 col-md-4">
        <label className="form-label mb-0">
          Orden
          <input
            className="form-control"
            type="number"
            min="1"
            value={form.orden}
            onChange={(event) => onFieldChange('orden', event.target.value)}
            disabled={saving}
          />
        </label>
      </div>

      <div className="col-12 col-md-8">
        <div className="centros-costo-form-checks">
          <label className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={form.seleccionable_en_contabilizacion}
              onChange={(event) => onFieldChange('seleccionable_en_contabilizacion', event.target.checked)}
              disabled={saving}
            />
            <span className="form-check-label">Seleccionable en contabilización</span>
          </label>

          <label className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={form.activo}
              onChange={(event) => onFieldChange('activo', event.target.checked)}
              disabled={saving}
            />
            <span className="form-check-label">Centro activo</span>
          </label>
        </div>
      </div>

      <div className="col-12">
        <div className="small text-muted">
          {editing ? 'Editando centro existente.' : 'Creando centro nuevo.'} Padre actual: {selectedParentLabel || 'Raíz de la sociedad'}.
        </div>
      </div>
    </form>
  );
}

function CentrosCosto({ sociedadId }) {
  const fileInputRef = useRef(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [treeModalOpen, setTreeModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('codigo');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const {
    usuarios,
    roles,
    loading,
    saving,
    message,
    error,
    search,
    showInactive,
    onlySelectable,
    filteredCentros,
    treeNodes,
    stats,
    form,
    editingId,
    parentOptions,
    suggestedParent,
    importSummary,
    setSearch,
    setShowInactive,
    setOnlySelectable,
    setFormField,
    startCreate,
    startEdit,
    resetForm,
    handleSubmit,
    toggleActivo,
    downloadTemplate,
    importCsv,
  } = useCentrosCostoCatalog({ sociedadId });

  const editing = Boolean(editingId);
  const selectedParentLabel = useMemo(() => {
    if (form.centro_padre_id === ROOT_PARENT_CODE) {
      return 'Raíz de la sociedad';
    }

    return parentOptions.find((option) => String(option.id) === String(form.centro_padre_id))?.nombre || '';
  }, [form.centro_padre_id, parentOptions]);

  const sortedCentros = useMemo(
    () => sortCentrosCosto(filteredCentros, sortBy, sortDir),
    [filteredCentros, sortBy, sortDir]
  );
  const totalPages = Math.ceil(sortedCentros.length / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pagedCentros = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCentros.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedCentros]);
  const visiblePages = useMemo(
    () => buildVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const paginationMeta = useMemo(() => ({
    totalItems: sortedCentros.length,
    page: totalPages === 0 ? 0 : currentPage,
    totalPages,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
  }), [currentPage, sortedCentros.length, totalPages]);

  const closeFormModal = useCallback(() => {
    resetForm();
    setFormModalOpen(false);
  }, [resetForm]);

  const openCreateModal = useCallback(() => {
    startCreate();
    setFormModalOpen(true);
  }, [startCreate]);

  const openEditModal = useCallback((centro) => {
    setTreeModalOpen(false);
    startEdit(centro);
    setFormModalOpen(true);
  }, [startEdit]);

  const handleSearchChange = useCallback((event) => {
    setSearch(event.target.value);
    setPage(1);
  }, [setSearch]);

  const handleShowInactiveChange = useCallback((event) => {
    setShowInactive(event.target.checked);
    setPage(1);
  }, [setShowInactive]);

  const handleOnlySelectableChange = useCallback((event) => {
    setOnlySelectable(event.target.checked);
    setPage(1);
  }, [setOnlySelectable]);

  const handleSort = useCallback((nextSortBy, nextSortDir) => {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setPage(1);
  }, []);

  const handleSetPageSize = useCallback((value) => {
    setPageSize(Number(value));
    setPage(1);
  }, []);

  const handleFormSubmit = useCallback(async (event) => {
    const saved = await handleSubmit(event);
    if (saved) {
      setFormModalOpen(false);
    }
  }, [handleSubmit]);

  if (!sociedadId) {
    return (
      <div className="documents-page">
        <EmptyState className="py-2">Seleccione una sociedad para gestionar centros de costo.</EmptyState>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Cargando centros de costo..." />;
  }

  return (
    <div className="documents-page facturas-page centros-costo-page">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,.txt"
        className="d-none"
        onChange={async (event) => {
          const file = event.target.files?.[0] || null;
          if (!file) {
            return;
          }

          await importCsv(file);
          event.target.value = '';
        }}
      />

      <PageHeader
        title="Centros de costo"
        subtitle="Administra la jerarquía, aprobadores y disponibilidad para contabilización."
        actions={(
          <div className="facturas-toolbar-actions">
            <button className="btn btn-outline-secondary" type="button" onClick={downloadTemplate}>
              Descargar plantilla
            </button>
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              {saving ? 'Procesando...' : 'Importar CSV'}
            </button>
            <button className="btn btn-outline-primary" type="button" onClick={openCreateModal}>
              Nuevo centro
            </button>
          </div>
        )}
      />

      <ActionAlerts error={error} message={message} />
      <ImportSummary summary={importSummary} />

      <FiltersBar className="facturas-toolbar centros-costo-toolbar">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar por código, nombre o aprobador..."
        />
        <div className="facturas-toolbar-actions centros-costo-filter-actions">
          <label className="centros-costo-filter-toggle">
            <input
              className="form-check-input"
              type="checkbox"
              checked={showInactive}
              onChange={handleShowInactiveChange}
            />
            <span>Mostrar inactivos</span>
          </label>
          <label className="centros-costo-filter-toggle">
            <input
              className="form-check-input"
              type="checkbox"
              checked={onlySelectable}
              onChange={handleOnlySelectableChange}
            />
            <span>Solo seleccionables</span>
          </label>
          {search.trim() ? (
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
          ) : null}
        </div>
      </FiltersBar>

      <CentrosCostoSummaryCards
        stats={stats}
        filteredCount={filteredCentros.length}
        currentPage={paginationMeta.page}
        totalPages={totalPages}
        treeCount={treeNodes.length}
        onOpenTree={() => setTreeModalOpen(true)}
      />

      <SectionCard title="Tabla completa" className="table-card facturas-table-card centros-costo-table-card" bodyClassName="p-0">
        {filteredCentros.length === 0 ? (
          <div className="py-4">
            <EmptyState className="text-center py-2">No hay centros de costo que mostrar.</EmptyState>
          </div>
        ) : (
          <>
            <CentrosCostoTable
              centros={pagedCentros}
              saving={saving}
              onEdit={openEditModal}
              onToggleActive={toggleActivo}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <CentrosCostoMobileCards
              centros={pagedCentros}
              saving={saving}
              onEdit={openEditModal}
              onToggleActive={toggleActivo}
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
          title={editing ? `Editar centro ${form.codigo}` : 'Nuevo centro de costo'}
          onClose={closeFormModal}
          size="modal-lg"
          footer={(
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" form="centro-costo-form" disabled={saving}>
                {saving ? 'Guardando...' : editing ? 'Actualizar centro' : 'Crear centro'}
              </button>
            </>
          )}
        >
          <CentrosCostoForm
            form={form}
            editing={editing}
            saving={saving}
            selectedParentLabel={selectedParentLabel}
            suggestedParent={suggestedParent}
            parentOptions={parentOptions}
            roles={roles}
            usuarios={usuarios}
            onFieldChange={setFormField}
            onSubmit={handleFormSubmit}
          />
        </SimpleModal>
      )}

      {treeModalOpen && (
        <SimpleModal
          title="Jerarquía de centros de costo"
          onClose={() => setTreeModalOpen(false)}
          size="modal-xl centros-costo-tree-modal"
          footer={(
            <button className="btn btn-outline-secondary" type="button" onClick={() => setTreeModalOpen(false)}>
              Cerrar
            </button>
          )}
        >
          <div className="centros-costo-tree-modal-summary">
            <span>{treeNodes.length} raíces visibles</span>
            <span>{filteredCentros.length} centros filtrados</span>
            {onlySelectable ? <span>Solo seleccionables</span> : null}
            {showInactive ? <span>Incluye inactivos</span> : null}
          </div>

          {treeNodes.length === 0 ? (
            <EmptyState className="py-2">No hay centros de costo para los filtros seleccionados.</EmptyState>
          ) : (
            <div className="centros-costo-tree-modal-body">
              <ul className="centros-costo-tree-list root">
                {treeNodes.map((node) => (
                  <CentroTreeNode
                    key={node.id}
                    node={node}
                    onEdit={openEditModal}
                    onToggleActive={toggleActivo}
                    saving={saving}
                  />
                ))}
              </ul>
            </div>
          )}
        </SimpleModal>
      )}
    </div>
  );
}

export default CentrosCosto;
