import SectionCard from '../common/SectionCard';
import EmptyState from '../common/EmptyState';

const ROLES_TODAS_SOCIEDADES = new Set([
  'admin',
  'gerencia_financiera',
  'contabilidad_jefe',
  'tesoreria_encargado'
]);

const roleRequiresAssignments = (roleCode) => !ROLES_TODAS_SOCIEDADES.has(String(roleCode || '').toLowerCase());

function UsuarioSociedadesCard({
  sociedadesUser,
  sociedades,
  sociedadesAsignadas,
  savingSociedades,
  onClose,
  onToggleSociedad,
  onSaveSociedades,
  asCard = true,
  hideActions = false
}) {
  if (!sociedadesUser) {
    return null;
  }

  const content = (
    <>
      {roleRequiresAssignments(sociedadesUser.rol_codigo) ? (
        <>
          <div className="text-muted small mb-2">
            Selecciona las sociedades que este usuario puede operar.
          </div>
          {sociedades.length === 0 && (
            <EmptyState className="py-2">No hay sociedades disponibles.</EmptyState>
          )}
          {sociedades.length > 0 && (
            <div className="row g-2 mb-3">
              {sociedades.map((sociedad) => (
                <div className="col-12 col-md-6" key={sociedad.id}>
                  <label className="form-check border rounded p-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={sociedadesAsignadas.includes(sociedad.id)}
                      onChange={() => onToggleSociedad(sociedad.id)}
                      disabled={savingSociedades}
                    />
                    <span className="form-check-label">
                      <span className="fw-semibold d-block">
                        {sociedad.nombre_proyecto || sociedad.razon_social}
                      </span>
                      <span className="text-muted small">
                        {sociedad.cedula_juridica}
                      </span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
          {!hideActions && (
            <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              type="button"
              onClick={onSaveSociedades}
              disabled={savingSociedades}
            >
              {savingSociedades ? 'Guardando...' : 'Guardar sociedades'}
            </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState className="py-2">
          Este rol tiene acceso a todas las sociedades; no requiere asignacion manual.
        </EmptyState>
      )}
    </>
  );

  if (!asCard) {
    return content;
  }

  return (
    <SectionCard
      title={`Sociedades asignadas a ${sociedadesUser.nombre}`}
      className="mt-3"
      actions={(
        <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onClose}>
          Cerrar
        </button>
      )}
    >
      {content}
    </SectionCard>
  );
}

export default UsuarioSociedadesCard;
