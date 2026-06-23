import SectionCard from '../common/SectionCard';
import EmptyState from '../common/EmptyState';
import DataTable from '../common/DataTable';
import { formatDateTime } from '../../utils/formatters';

const USUARIOS_TABLE_HEADERS = Object.freeze([
  { key: 'nombre', label: 'Nombre', sortable: true, sortKey: 'nombre' },
  { key: 'email', label: 'Email', sortable: true, sortKey: 'email' },
  { key: 'rol', label: 'Rol', sortable: true, sortKey: 'rol' },
  { key: 'estado', label: 'Estado', sortable: true, sortKey: 'estado' },
  { key: 'creado', label: 'Creado', sortable: true, sortKey: 'creado' },
  { key: 'acciones', label: 'ACCIONES', align: 'end' },
]);

function UsuarioStatusBadge({ activo }) {
  return (
    <span className={`status-badge ${activo ? 'badge-soft-success' : 'badge-soft-secondary'}`}>
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function UsuarioActions({
  user,
  saving,
  savingSociedades,
  onEdit,
  onOpenSociedades,
  onToggleActive
}) {
  return (
    <div className="usuarios-row-actions">
      <button
        className="btn btn-outline-primary btn-sm"
        type="button"
        onClick={() => onEdit(user)}
        disabled={saving}
      >
        Editar
      </button>
      <button
        className="btn btn-outline-secondary btn-sm"
        type="button"
        onClick={() => onOpenSociedades(user)}
        disabled={saving || savingSociedades}
      >
        Sociedades
      </button>
      <button
        className={`btn btn-sm ${user.activo ? 'btn-outline-danger' : 'btn-outline-success'}`}
        type="button"
        onClick={() => onToggleActive(user)}
        disabled={saving}
      >
        {user.activo ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  );
}

function UsuariosDesktopTable({
  users,
  saving,
  savingSociedades,
  onEdit,
  onOpenSociedades,
  onToggleActive,
  sortBy,
  sortDir,
  onSort,
}) {
  return (
    <DataTable
      headers={USUARIOS_TABLE_HEADERS}
      stickyHeader
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      className="d-none d-lg-block"
      tableClassName="table table-hover align-middle mb-0 facturas-data-table usuarios-data-table"
    >
      {users.map((user) => (
        <tr key={user.id}>
          <td>
            <div className="usuario-name-cell">
              <div className="usuario-primary-text">{user.nombre}</div>
              <div className="usuario-meta-text">ID {user.id}</div>
            </div>
          </td>
          <td>
            <div className="usuario-primary-text">{user.email}</div>
          </td>
          <td>
            <div className="usuario-role-cell">
              <div className="usuario-primary-text">{user.rol_nombre || '-'}</div>
              <div className="usuario-meta-text">{user.rol_codigo || `ROL ${user.rol_id}`}</div>
            </div>
          </td>
          <td><UsuarioStatusBadge activo={user.activo} /></td>
          <td>{formatDateTime(user.creado_en)}</td>
          <td className="text-end">
            <UsuarioActions
              user={user}
              saving={saving}
              savingSociedades={savingSociedades}
              onEdit={onEdit}
              onOpenSociedades={onOpenSociedades}
              onToggleActive={onToggleActive}
            />
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function UsuariosMobileCards({
  users,
  saving,
  savingSociedades,
  onEdit,
  onOpenSociedades,
  onToggleActive,
}) {
  return (
    <div className="usuarios-mobile-list d-grid gap-2 d-lg-none">
      {users.map((user) => (
        <div className="usuario-mobile-card" key={user.id}>
          <div className="d-flex justify-content-between gap-2">
            <div className="usuario-mobile-title">
              <div className="usuario-primary-text">{user.nombre}</div>
              <div className="usuario-meta-text">{user.email}</div>
            </div>
            <UsuarioStatusBadge activo={user.activo} />
          </div>
          <div className="usuario-mobile-details">
            <div>
              <span className="usuario-meta-label">Rol</span>
              <span>{user.rol_nombre || '-'}</span>
            </div>
            <div>
              <span className="usuario-meta-label">Código</span>
              <span>{user.rol_codigo || `ROL ${user.rol_id}`}</span>
            </div>
            <div>
              <span className="usuario-meta-label">Creado</span>
              <span>{formatDateTime(user.creado_en)}</span>
            </div>
          </div>
          <UsuarioActions
            user={user}
            saving={saving}
            savingSociedades={savingSociedades}
            onEdit={onEdit}
            onOpenSociedades={onOpenSociedades}
            onToggleActive={onToggleActive}
          />
        </div>
      ))}
    </div>
  );
}

function UsuariosListCard({
  users,
  saving,
  savingSociedades,
  onEdit,
  onOpenSociedades,
  onToggleActive,
  sortBy,
  sortDir,
  onSort,
}) {
  return (
    <SectionCard title="Usuarios registrados" className="table-card facturas-table-card usuarios-table-card" bodyClassName="p-0">
      {users.length === 0 ? (
        <div className="py-4">
          <EmptyState className="text-center py-2">No hay usuarios para mostrar.</EmptyState>
        </div>
      ) : (
        <>
          <UsuariosDesktopTable
            users={users}
            saving={saving}
            savingSociedades={savingSociedades}
            onEdit={onEdit}
            onOpenSociedades={onOpenSociedades}
            onToggleActive={onToggleActive}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
          <UsuariosMobileCards
            users={users}
            saving={saving}
            savingSociedades={savingSociedades}
            onEdit={onEdit}
            onOpenSociedades={onOpenSociedades}
            onToggleActive={onToggleActive}
          />
        </>
      )}
    </SectionCard>
  );
}

export default UsuariosListCard;
