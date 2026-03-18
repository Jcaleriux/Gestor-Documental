import { useTramites } from '../hooks/useTramites';
import { useTramitesViewModel } from '../hooks/tramites/useTramitesViewModel';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import TramiteCreatePanel from './tramites/TramiteCreatePanel';
import TramitesTableSection from './tramites/TramitesTableSection';
import { TRAMITES_LABELS, LOADING_LABELS } from '../utils/uiLabels';

function Tramites({ sociedadId, canCreateTramite = true, authUser = null }) {
  const actorUsuario = authUser?.email || authUser?.nombre || 'system';

  const {
    tramites,
    loading,
    loadingDocs,
    facturasDisponibles,
    retencionesDisponibles,
    actionMessage,
    setActionMessage,
    actionError,
    setActionError,
    fetchFacturasDisponibles,
    crearTramite: crearTramiteApi
  } = useTramites({ sociedadId });

  const {
    search,
    setSearch,
    estado,
    setEstado,
    showCreate,
    selectedFacturas,
    selectedRetenciones,
    createFilters,
    updateCreateFilter,
    openCreate,
    closeCreate,
    crearTramite,
    toggleSeleccionFactura,
    toggleSeleccionRetencion,
    tramitesFiltrados,
    facturasFiltradas,
    retencionesFiltradas,
    totalFacturasSeleccionadas,
    totalRetencionesSeleccionadas,
    totalSeleccionado,
    totalPorMoneda,
    monedasDisponibles,
    marcarTodosVisibles,
    desmarcarTodos
  } = useTramitesViewModel({
    tramites,
    facturasDisponibles,
    retencionesDisponibles,
    canCreateTramite,
    actorUsuario,
    fetchFacturasDisponibles,
    crearTramiteApi,
    setActionMessage,
    setActionError
  });

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver los tramites de pago.</p>;
  }

  if (loading) return <LoadingState label={LOADING_LABELS.tramites} />;

  return (
    <div className="documents-page">
      <PageHeader
        title={TRAMITES_LABELS.pageTitle}
        subtitle={TRAMITES_LABELS.pageSubtitle}
        actions={canCreateTramite ? (
          <button className="btn btn-primary" type="button" onClick={openCreate} disabled={!sociedadId}>
            {TRAMITES_LABELS.createButton}
          </button>
        ) : null}
      />

      {!canCreateTramite && (
        <div className="alert alert-info mb-3">
          Tienes acceso de consulta. Para crear tramites necesitas el permiso de tramitar pago.
        </div>
      )}

      <TramiteCreatePanel
        showCreate={showCreate}
        canCreateTramite={canCreateTramite}
        sociedadId={sociedadId}
        closeCreate={closeCreate}
        actionError={actionError}
        actionMessage={actionMessage}
        setActionError={setActionError}
        loadingDocs={loadingDocs}
        createFilters={createFilters}
        updateCreateFilter={updateCreateFilter}
        monedasDisponibles={monedasDisponibles}
        facturasFiltradas={facturasFiltradas}
        retencionesFiltradas={retencionesFiltradas}
        selectedFacturas={selectedFacturas}
        selectedRetenciones={selectedRetenciones}
        onToggleFactura={toggleSeleccionFactura}
        onToggleRetencion={toggleSeleccionRetencion}
        totalFacturasSeleccionadas={totalFacturasSeleccionadas}
        totalRetencionesSeleccionadas={totalRetencionesSeleccionadas}
        totalSeleccionado={totalSeleccionado}
        totalPorMoneda={totalPorMoneda}
        marcarTodosVisibles={marcarTodosVisibles}
        desmarcarTodos={desmarcarTodos}
        crearTramite={crearTramite}
      />

      <TramitesTableSection
        search={search}
        onSearchChange={setSearch}
        estado={estado}
        onEstadoChange={setEstado}
        tramitesFiltrados={tramitesFiltrados}
      />
    </div>
  );
}

export default Tramites;
