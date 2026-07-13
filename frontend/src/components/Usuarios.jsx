import { useCallback, useMemo, useState } from 'react';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import ActionAlerts from './common/ActionAlerts';
import FiltersBar from './common/FiltersBar';
import SearchInput from './common/SearchInput';
import FacturasPagination from './facturas/FacturasPagination';
import { LOADING_LABELS } from '../utils/uiLabels';
import { useUsuariosAdminViewModel } from '../hooks/usuarios/useUsuariosAdminViewModel';
import UsuarioFormCard from './usuarios/UsuarioFormCard';
import UsuariosListCard from './usuarios/UsuariosListCard';
import UsuarioSociedadesCard from './usuarios/UsuarioSociedadesCard';
import RolesAdminCard from './usuarios/RolesAdminCard';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const ROLES_TODAS_SOCIEDADES = new Set([
  'admin',
  'gerencia_financiera',
  'contabilidad_jefe',
  'tesoreria_encargado'
]);

const roleRequiresAssignments = (roleCode) => !ROLES_TODAS_SOCIEDADES.has(String(roleCode || '').toLowerCase());

const usuariosCollator = new Intl.Collator('es', {
  sensitivity: 'base',
  numeric: true
});

const getUsuarioSortValue = (user, sortBy) => {
  switch (sortBy) {
    case 'nombre':
      return user.nombre || '';
    case 'email':
      return user.email || '';
    case 'rol':
      return `${user.rol_nombre || ''} ${user.rol_codigo || ''}`;
    case 'estado':
      return user.activo ? 0 : 1;
    case 'creado': {
      const date = new Date(user.creado_en || 0);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
    default:
      return user.nombre || '';
  }
};

const sortUsuarios = (items, sortBy, sortDir) => {
  const direction = sortDir === 'desc' ? -1 : 1;

  return [...items].sort((left, right) => {
    const leftValue = getUsuarioSortValue(left, sortBy);
    const rightValue = getUsuarioSortValue(right, sortBy);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : usuariosCollator.compare(String(leftValue), String(rightValue));

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

function UsuariosSummaryCards({ total, page, totalPages, users, rolesCount }) {
  const activos = users.filter((user) => user.activo).length;
  const inactivos = users.length - activos;

  return (
    <div className="facturas-summary-grid usuarios-summary-grid">
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Resultados</span>
        <strong className="facturas-summary-value">{total} usuarios</strong>
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
      <div className="facturas-summary-card">
        <span className="facturas-summary-label">Roles</span>
        <strong className="facturas-summary-value">{rolesCount} roles</strong>
        <span className="facturas-summary-meta">Disponibles para asignación</span>
      </div>
    </div>
  );
}

function Usuarios() {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const {
    roles,
    permisos,
    sociedades,
    loading,
    saving,
    savingRole,
    savingSociedades,
    editingId,
    editingRoleId,
    isEditing,
    isEditingRole,
    sociedadesUser,
    sociedadesAsignadas,
    search,
    setSearch,
    form,
    roleForm,
    message,
    error,
    filteredUsers,
    startCreate,
    startEdit,
    startCreateRole,
    startEditRole,
    resetForm,
    resetRoleForm,
    setFormField,
    setRoleFormField,
    handleFormSubmit,
    handleRoleFormSubmit,
    handleToggleActive,
    toggleRolePermission,
    openSociedadesPanel,
    closeSociedadesPanel,
    toggleSociedad,
    saveSociedades
  } = useUsuariosAdminViewModel();

  const sortedUsers = useMemo(
    () => sortUsuarios(filteredUsers, sortBy, sortDir),
    [filteredUsers, sortBy, sortDir]
  );
  const totalPages = Math.ceil(sortedUsers.length / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedUsers]);
  const visiblePages = useMemo(
    () => buildVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );
  const paginationMeta = useMemo(() => ({
    totalItems: sortedUsers.length,
    page: totalPages === 0 ? 0 : currentPage,
    totalPages,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages
  }), [currentPage, sortedUsers.length, totalPages]);

  const openCreateModal = useCallback(() => {
    closeSociedadesPanel();
    startCreate();
    setFormModalOpen(true);
  }, [closeSociedadesPanel, startCreate]);

  const openEditModal = useCallback((user) => {
    closeSociedadesPanel();
    startEdit(user);
    setFormModalOpen(true);
  }, [closeSociedadesPanel, startEdit]);

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

  const handleModalFormSubmit = useCallback(async (event) => {
    const saved = await handleFormSubmit(event);
    if (saved) {
      setFormModalOpen(false);
    }
  }, [handleFormSubmit]);

  const handleSaveSociedades = useCallback(async () => {
    const saved = await saveSociedades();
    if (saved) {
      closeSociedadesPanel();
    }
  }, [closeSociedadesPanel, saveSociedades]);
  const sociedadesModalRequiresAssignments = roleRequiresAssignments(sociedadesUser?.rol_codigo);

  if (loading) return <LoadingState label={LOADING_LABELS.usuarios} />;

  return (
    <div className="documents-page facturas-page usuarios-page">
      <PageHeader
        title="Administración de usuarios"
        subtitle="Crea, actualiza y controla el acceso de usuarios por rol."
        actions={(
          <button className="btn btn-outline-primary" type="button" onClick={openCreateModal}>
            Nuevo usuario
          </button>
        )}
      />

      <ActionAlerts error={error} message={message} />

      <FiltersBar className="facturas-toolbar usuarios-toolbar">
        <SearchInput
          placeholder="Buscar por nombre, email o rol..."
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

      <UsuariosSummaryCards
        total={filteredUsers.length}
        page={paginationMeta.page}
        totalPages={totalPages}
        users={filteredUsers}
        rolesCount={roles.length}
      />

      <RolesAdminCard
        roles={roles}
        permisos={permisos}
        roleForm={roleForm}
        savingRole={savingRole}
        editingRoleId={editingRoleId}
        isEditingRole={isEditingRole}
        onStartCreateRole={startCreateRole}
        onStartEditRole={startEditRole}
        onResetRoleForm={resetRoleForm}
        onRoleFieldChange={setRoleFormField}
        onToggleRolePermission={toggleRolePermission}
        onSubmit={handleRoleFormSubmit}
      />

      <UsuariosListCard
        users={pagedUsers}
        saving={saving}
        savingSociedades={savingSociedades}
        onEdit={openEditModal}
        onOpenSociedades={openSociedadesPanel}
        onToggleActive={handleToggleActive}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
      />

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
          title={isEditing ? `Editar usuario #${editingId}` : 'Nuevo usuario'}
          onClose={closeFormModal}
          size="modal-lg"
          footer={(
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal} disabled={saving}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" form="usuario-form" disabled={saving}>
                {saving ? 'Guardando...' : (isEditing ? 'Actualizar usuario' : 'Crear usuario')}
              </button>
            </>
          )}
        >
          <UsuarioFormCard
            asCard={false}
            hideActions
            formId="usuario-form"
            isEditing={isEditing}
            editingId={editingId}
            form={form}
            roles={roles}
            saving={saving}
            onSubmit={handleModalFormSubmit}
            onFieldChange={setFormField}
            onCancel={closeFormModal}
          />
        </SimpleModal>
      )}

      {sociedadesUser && (
        <SimpleModal
          title={`Sociedades asignadas a ${sociedadesUser.nombre}`}
          onClose={closeSociedadesPanel}
          size="modal-lg"
          footer={sociedadesModalRequiresAssignments ? (
            <>
              <button className="btn btn-outline-secondary" type="button" onClick={closeSociedadesPanel} disabled={savingSociedades}>
                Cancelar
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSaveSociedades} disabled={savingSociedades}>
                {savingSociedades ? 'Guardando...' : 'Guardar sociedades'}
              </button>
            </>
          ) : (
            <button className="btn btn-outline-secondary" type="button" onClick={closeSociedadesPanel}>
              Cerrar
            </button>
          )}
        >
          <UsuarioSociedadesCard
            asCard={false}
            hideActions
            sociedadesUser={sociedadesUser}
            sociedades={sociedades}
            sociedadesAsignadas={sociedadesAsignadas}
            savingSociedades={savingSociedades}
            onClose={closeSociedadesPanel}
            onToggleSociedad={toggleSociedad}
            onSaveSociedades={handleSaveSociedades}
          />
        </SimpleModal>
      )}
    </div>
  );
}

export default Usuarios;
