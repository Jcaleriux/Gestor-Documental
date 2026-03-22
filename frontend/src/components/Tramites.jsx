import { useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTramites } from '../hooks/useTramites';
import { useTramitesViewModel } from '../hooks/tramites/useTramitesViewModel';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import TramiteCreatePanel from './tramites/TramiteCreatePanel';
import TramitesTableSection from './tramites/TramitesTableSection';
import {
  buildTramitesSearch,
  getTramitesReturnActionLabel,
  parseTramitesEstadoFromSearch,
  parseTramitesReturnContextFromSearch,
} from './tramites/tramitesPageHelpers';
import { TRAMITES_LABELS, LOADING_LABELS } from '../utils/uiLabels';

function Tramites({ sociedadId, canCreateTramite = true, authUser = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const actorUsuario = authUser?.email || authUser?.nombre || 'system';
  const estado = useMemo(
    () => parseTramitesEstadoFromSearch(location.search),
    [location.search],
  );
  const returnContext = useMemo(
    () => parseTramitesReturnContextFromSearch(location.search),
    [location.search],
  );
  const canonicalSearch = useMemo(
    () => buildTramitesSearch({
      estado,
      returnTo: returnContext.returnTo,
      returnLabel: returnContext.returnLabel,
    }),
    [estado, returnContext.returnLabel, returnContext.returnTo],
  );

  const handleEstadoChange = useCallback((nextEstado) => {
    const nextSearch = buildTramitesSearch({
      estado: nextEstado,
      returnTo: returnContext.returnTo,
      returnLabel: returnContext.returnLabel,
    });

    if (nextSearch !== location.search) {
      navigate({
        pathname: location.pathname,
        search: nextSearch,
      });
    }
  }, [location.pathname, location.search, navigate, returnContext.returnLabel, returnContext.returnTo]);

  useEffect(() => {
    if (canonicalSearch !== location.search) {
      navigate(
        {
          pathname: location.pathname,
          search: canonicalSearch,
        },
        { replace: true },
      );
    }
  }, [canonicalSearch, location.pathname, location.search, navigate]);

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
    crearTramite: crearTramiteApi,
  } = useTramites({ sociedadId, estado });

  const {
    search,
    setSearch,
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
    desmarcarTodos,
  } = useTramitesViewModel({
    tramites,
    facturasDisponibles,
    retencionesDisponibles,
    canCreateTramite,
    actorUsuario,
    estadoState: {
      value: estado,
      onChange: handleEstadoChange,
    },
    fetchFacturasDisponibles,
    crearTramiteApi,
    setActionMessage,
    setActionError,
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
        actions={(
          <div className="d-flex gap-2">
            {returnContext.returnTo ? (
              <Link className="btn btn-outline-secondary" to={returnContext.returnTo}>
                {getTramitesReturnActionLabel(returnContext.returnLabel)}
              </Link>
            ) : null}
            {canCreateTramite ? (
              <button className="btn btn-primary" type="button" onClick={openCreate} disabled={!sociedadId}>
                {TRAMITES_LABELS.createButton}
              </button>
            ) : null}
          </div>
        )}
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
        onEstadoChange={handleEstadoChange}
        tramitesFiltrados={tramitesFiltrados}
      />
    </div>
  );
}

export default Tramites;
