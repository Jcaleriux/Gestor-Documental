import SectionCard from '../common/SectionCard';
import EmptyState from '../common/EmptyState';
import { formatDateTime } from '../../utils/formatters';

function UsuariosListCard({
  filteredUsers,
  search,
  onSearchChange,
  saving,
  savingSociedades,
  onEdit,
  onOpenSociedades,
  onToggleActive
}) {
  return (
    <SectionCard
      title="Usuarios registrados"
      actions={(
        <input
          className="form-control"
          style={{ minWidth: '260px' }}
          placeholder="Buscar por nombre, email o rol..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      )}
    >
      {filteredUsers.length === 0 ? (
        <EmptyState className="py-2">No hay usuarios para mostrar.</EmptyState>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.nombre}</td>
                  <td>{user.email}</td>
                  <td>
                    <div>{user.rol_nombre || '-'}</div>
                    <div className="text-muted small">{user.rol_codigo || `ROL ${user.rol_id}`}</div>
                  </td>
                  <td>
                    <span className={`badge ${user.activo ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{formatDateTime(user.creado_en)}</td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export default UsuariosListCard;
