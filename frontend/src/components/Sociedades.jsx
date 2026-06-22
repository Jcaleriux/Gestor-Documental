import { useSociedadesAdmin } from '../hooks/sociedades/useSociedadesAdmin.js';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import LoadingState from './common/LoadingState';
import EmptyState from './common/EmptyState';
import ActionAlerts from './common/ActionAlerts';
import { formatDateTime } from '../utils/formatters';

function Sociedades({ onSociedadesChange }) {
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

  if (loading) return <LoadingState label="Cargando sociedades..." />;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Administracion de sociedades"
        subtitle="Crea, edita y desactiva las sociedades disponibles en la operacion."
        actions={(
          <button className="btn btn-outline-primary" type="button" onClick={startCreate}>
            Nueva sociedad
          </button>
        )}
      />

      <ActionAlerts error={error} message={message} />

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <SectionCard title={isEditing ? `Editar sociedad #${editingId}` : 'Nueva sociedad'}>
            <form className="d-grid gap-2" onSubmit={handleSubmit}>
              <label className="form-label mb-0">
                Codigo
                <input
                  className="form-control"
                  value={form.codigo}
                  maxLength={20}
                  onChange={(event) => setFormField('codigo', event.target.value.toUpperCase())}
                  placeholder="CODIGO"
                />
              </label>

              <label className="form-label mb-0">
                Nombre proyecto
                <input
                  className="form-control"
                  value={form.nombre_proyecto}
                  maxLength={150}
                  onChange={(event) => setFormField('nombre_proyecto', event.target.value)}
                />
              </label>

              <label className="form-label mb-0">
                Razon social
                <input
                  className="form-control"
                  value={form.razon_social}
                  maxLength={255}
                  onChange={(event) => setFormField('razon_social', event.target.value)}
                  required
                />
              </label>

              <label className="form-label mb-0">
                Cedula juridica
                <input
                  className="form-control"
                  value={form.cedula_juridica}
                  maxLength={20}
                  onChange={(event) => setFormField('cedula_juridica', event.target.value)}
                  required
                />
              </label>

              <label className="form-check mt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={form.activo}
                  onChange={(event) => setFormField('activo', event.target.checked)}
                />
                <span className="form-check-label">Sociedad activa</span>
              </label>

              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-primary flex-grow-1" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : isEditing ? 'Actualizar sociedad' : 'Crear sociedad'}
                </button>
                {isEditing ? (
                  <button className="btn btn-outline-secondary" type="button" onClick={resetForm} disabled={saving}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-8">
          <SectionCard
            title="Sociedades registradas"
            actions={(
              <input
                className="form-control"
                style={{ minWidth: '260px' }}
                placeholder="Buscar por codigo, nombre o cedula..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            )}
          >
            {filteredSociedades.length === 0 ? (
              <EmptyState className="py-2">No hay sociedades para mostrar.</EmptyState>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Sociedad</th>
                      <th>Cedula juridica</th>
                      <th>Estado</th>
                      <th>Creada</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSociedades.map((sociedad) => (
                      <tr key={sociedad.id}>
                        <td>{sociedad.id}</td>
                        <td>
                          <div className="fw-semibold">{sociedad.nombre_proyecto || sociedad.razon_social}</div>
                          <div className="text-muted small">
                            {[sociedad.codigo, sociedad.razon_social].filter(Boolean).join(' | ') || '-'}
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
                          <div className="d-inline-flex gap-2">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              type="button"
                              onClick={() => startEdit(sociedad)}
                              disabled={saving}
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              type="button"
                              onClick={() => toggleActivo(sociedad)}
                              disabled={saving}
                            >
                              {sociedad.activo === false ? 'Activar' : 'Inactivar'}
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
        </div>
      </div>
    </div>
  );
}

export default Sociedades;
