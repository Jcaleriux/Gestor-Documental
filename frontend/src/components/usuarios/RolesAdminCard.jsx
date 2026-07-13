import SectionCard from '../common/SectionCard';
import EmptyState from '../common/EmptyState';
import {
  countRolePermissions,
  groupPermisosByPrefix,
  normalizePermissionNames
} from '../../utils/rolesAdmin';

const ADMIN_REQUIRED_PERMISSIONS = new Set([
  'acceso_total',
  'usuarios_administrar'
]);

function RoleListItem({
  role,
  active,
  disabled,
  onSelect
}) {
  return (
    <button
      className={`roles-admin-list-item ${active ? 'is-active' : ''}`.trim()}
      type="button"
      onClick={() => onSelect(role)}
      disabled={disabled}
    >
      <span className="roles-admin-list-main">
        <strong>{role.nombre}</strong>
        <span>{role.codigo}</span>
      </span>
      <span className="roles-admin-count">{countRolePermissions(role)}</span>
    </button>
  );
}

function PermissionGroup({
  group,
  selectedPermissions,
  isAdminRole,
  savingRole,
  onToggle
}) {
  return (
    <div className="roles-permission-group">
      <div className="roles-permission-group-title">{group.label}</div>
      <div className="roles-permission-options">
        {group.permisos.map((permiso) => {
          const isRequiredAdminPermission = isAdminRole && ADMIN_REQUIRED_PERMISSIONS.has(permiso.nombre);
          const checked = selectedPermissions.has(permiso.nombre) || isRequiredAdminPermission;

          return (
            <label className="roles-permission-option" key={permiso.id || permiso.nombre}>
              <input
                className="form-check-input"
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(permiso.nombre)}
                disabled={savingRole || isRequiredAdminPermission}
              />
              <span>
                <strong>{permiso.nombre}</strong>
                {permiso.descripcion ? <small>{permiso.descripcion}</small> : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function RolesAdminCard({
  roles,
  permisos,
  roleForm,
  savingRole,
  editingRoleId,
  isEditingRole,
  onStartCreateRole,
  onStartEditRole,
  onResetRoleForm,
  onRoleFieldChange,
  onToggleRolePermission,
  onSubmit
}) {
  const permissionGroups = groupPermisosByPrefix(permisos);
  const selectedPermissions = new Set(normalizePermissionNames(roleForm.permisos));
  const isAdminRole = roleForm.codigo === 'admin';

  return (
    <SectionCard
      title="Roles y permisos"
      className="roles-admin-card"
      actions={(
        <button
          className="btn btn-outline-primary btn-sm"
          type="button"
          onClick={onStartCreateRole}
          disabled={savingRole}
        >
          Nuevo rol
        </button>
      )}
    >
      <div className="roles-admin-layout">
        <div className="roles-admin-list" aria-label="Roles disponibles">
          {roles.length === 0 ? (
            <EmptyState className="py-2">No hay roles disponibles.</EmptyState>
          ) : (
            roles.map((role) => (
              <RoleListItem
                key={role.id}
                role={role}
                active={Number(editingRoleId) === Number(role.id)}
                disabled={savingRole}
                onSelect={onStartEditRole}
              />
            ))
          )}
        </div>

        <form className="roles-admin-form" onSubmit={onSubmit}>
          <div className="roles-admin-form-grid">
            <label className="form-label mb-0">
              Codigo
              <input
                className="form-control"
                value={roleForm.codigo}
                onChange={(event) => onRoleFieldChange('codigo', event.target.value)}
                pattern="[a-z][a-z0-9_]*"
                maxLength={50}
                required
                disabled={savingRole || isEditingRole}
              />
            </label>

            <label className="form-label mb-0">
              Nombre
              <input
                className="form-control"
                value={roleForm.nombre}
                onChange={(event) => onRoleFieldChange('nombre', event.target.value)}
                maxLength={50}
                required
                disabled={savingRole}
              />
            </label>

            <label className="form-label mb-0">
              Nivel
              <input
                className="form-control"
                type="number"
                min="0"
                max="100"
                value={roleForm.nivel_jerarquia}
                onChange={(event) => onRoleFieldChange('nivel_jerarquia', event.target.value)}
                required
                disabled={savingRole}
              />
            </label>

            <label className="form-label mb-0 roles-admin-description">
              Descripcion
              <textarea
                className="form-control"
                rows="2"
                maxLength={255}
                value={roleForm.descripcion}
                onChange={(event) => onRoleFieldChange('descripcion', event.target.value)}
                disabled={savingRole}
              />
            </label>
          </div>

          <div className="roles-permissions-grid">
            {permissionGroups.length === 0 ? (
              <EmptyState className="py-2">No hay permisos disponibles.</EmptyState>
            ) : (
              permissionGroups.map((group) => (
                <PermissionGroup
                  key={group.group}
                  group={group}
                  selectedPermissions={selectedPermissions}
                  isAdminRole={isAdminRole}
                  savingRole={savingRole}
                  onToggle={onToggleRolePermission}
                />
              ))
            )}
          </div>

          <div className="roles-admin-actions">
            <button className="btn btn-primary" type="submit" disabled={savingRole}>
              {savingRole ? 'Guardando...' : (isEditingRole ? 'Actualizar rol' : 'Crear rol')}
            </button>
            {isEditingRole ? (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={onResetRoleForm}
                disabled={savingRole}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </SectionCard>
  );
}

export default RolesAdminCard;
