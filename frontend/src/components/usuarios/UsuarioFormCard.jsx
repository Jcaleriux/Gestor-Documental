import SectionCard from '../common/SectionCard';

function UsuarioFormCard({
  isEditing,
  editingId,
  form,
  roles,
  saving,
  onSubmit,
  onFieldChange,
  onCancel,
  asCard = true,
  formId = 'usuario-form',
  hideActions = false
}) {
  const formContent = (
    <form id={formId} className="row g-3" onSubmit={onSubmit}>
      <div className="col-12 col-md-6">
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

      <div className="col-12 col-md-6">
        <label className="form-label mb-0">
          Email
          <input
            className="form-control"
            type="email"
            value={form.email}
            onChange={(event) => onFieldChange('email', event.target.value)}
            required
            disabled={saving}
          />
        </label>
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label mb-0">
          Rol
          <select
            className="form-select"
            value={form.rol_id}
            onChange={(event) => onFieldChange('rol_id', event.target.value)}
            required
            disabled={saving}
          >
            <option value="">Seleccionar rol</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.nombre} ({role.codigo})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label mb-0">
          {isEditing ? 'Nueva contrasena (opcional)' : 'Contrasena'}
          <input
            className="form-control"
            type="password"
            value={form.password}
            onChange={(event) => onFieldChange('password', event.target.value)}
            placeholder={isEditing ? 'Dejar vacio para no cambiar' : 'Minimo 12, mayuscula, numero y simbolo'}
            minLength={12}
            required={!isEditing}
            disabled={saving}
          />
        </label>
      </div>

      <div className="col-12">
        <label className="form-check mt-1">
          <input
            className="form-check-input"
            type="checkbox"
            checked={form.activo}
            onChange={(event) => onFieldChange('activo', event.target.checked)}
            disabled={saving}
          />
          <span className="form-check-label">Usuario activo</span>
        </label>
      </div>

      {!hideActions && (
        <div className="col-12">
        <div className="d-flex gap-2 mt-2">
          <button className="btn btn-primary flex-grow-1" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : (isEditing ? 'Actualizar usuario' : 'Crear usuario')}
          </button>
          {isEditing && (
            <button className="btn btn-outline-secondary" type="button" onClick={onCancel} disabled={saving}>
              Cancelar
            </button>
          )}
        </div>
        </div>
      )}
    </form>
  );

  if (!asCard) {
    return formContent;
  }

  return (
    <SectionCard title={isEditing ? `Editar usuario #${editingId}` : 'Nuevo usuario'}>
      {formContent}
    </SectionCard>
  );
}

export default UsuarioFormCard;
