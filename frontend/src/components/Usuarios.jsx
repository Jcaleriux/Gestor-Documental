import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import ActionAlerts from './common/ActionAlerts';
import { LOADING_LABELS } from '../utils/uiLabels';
import { useUsuariosAdminViewModel } from '../hooks/usuarios/useUsuariosAdminViewModel';
import UsuarioFormCard from './usuarios/UsuarioFormCard';
import UsuariosListCard from './usuarios/UsuariosListCard';
import UsuarioSociedadesCard from './usuarios/UsuarioSociedadesCard';

function Usuarios() {
  const {
    roles,
    sociedades,
    loading,
    saving,
    savingSociedades,
    editingId,
    isEditing,
    sociedadesUser,
    sociedadesAsignadas,
    search,
    setSearch,
    form,
    message,
    error,
    filteredUsers,
    startCreate,
    startEdit,
    resetForm,
    setFormField,
    handleFormSubmit,
    handleToggleActive,
    openSociedadesPanel,
    closeSociedadesPanel,
    toggleSociedad,
    saveSociedades
  } = useUsuariosAdminViewModel();

  if (loading) return <LoadingState label={LOADING_LABELS.usuarios} />;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Administracion de usuarios"
        subtitle="Crea, actualiza y controla el acceso de usuarios por rol."
        actions={(
          <button className="btn btn-outline-primary" type="button" onClick={startCreate}>
            Nuevo usuario
          </button>
        )}
      />

      <ActionAlerts error={error} message={message} />

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <UsuarioFormCard
            isEditing={isEditing}
            editingId={editingId}
            form={form}
            roles={roles}
            saving={saving}
            onSubmit={handleFormSubmit}
            onFieldChange={setFormField}
            onCancel={resetForm}
          />
        </div>

        <div className="col-12 col-xl-8">
          <UsuariosListCard
            filteredUsers={filteredUsers}
            search={search}
            onSearchChange={setSearch}
            saving={saving}
            savingSociedades={savingSociedades}
            onEdit={startEdit}
            onOpenSociedades={openSociedadesPanel}
            onToggleActive={handleToggleActive}
          />

          <UsuarioSociedadesCard
            sociedadesUser={sociedadesUser}
            sociedades={sociedades}
            sociedadesAsignadas={sociedadesAsignadas}
            savingSociedades={savingSociedades}
            onClose={closeSociedadesPanel}
            onToggleSociedad={toggleSociedad}
            onSaveSociedades={saveSociedades}
          />
        </div>
      </div>
    </div>
  );
}

export default Usuarios;
