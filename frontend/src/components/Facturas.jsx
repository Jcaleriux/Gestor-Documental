import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFacturas } from '../hooks/useFacturas.js';
import { useFacturasFilters } from '../hooks/facturas/useFacturasFilters.js';
import { useFacturasReport } from '../hooks/facturas/useFacturasReport.js';
import { useFacturaRowActions } from '../hooks/facturas/useFacturaRowActions.js';
import EmptyState from './common/EmptyState.jsx';
import PageHeader from './common/PageHeader.jsx';
import LoadingState from './common/LoadingState.jsx';
import SectionCard from './common/SectionCard.jsx';
import SearchInput from './common/SearchInput.jsx';
import FiltersBar from './common/FiltersBar.jsx';
import ActionAlerts from './common/ActionAlerts.jsx';
import FacturasFiltersPanel from './facturas/FacturasFiltersPanel.jsx';
import FacturasPagination from './facturas/FacturasPagination.jsx';
import FacturasSummaryCards from './facturas/FacturasSummaryCards.jsx';
import FacturasTable from './facturas/FacturasTable.jsx';
import {
  FACTURAS_TABLE_HEADERS,
  buildFacturasRoute,
  buildFilterChips,
  buildVisiblePages,
  getReturnActionLabel,
  parseDashboardPresetFromSearch,
  parseReturnContextFromSearch,
} from './facturas/facturasPageHelpers.js';
import { FACTURAS_LABELS, LOADING_LABELS } from '../utils/uiLabels.js';

const clearFilterByKey = ({
  chipKey,
  navigate,
  returnContext,
  dashboardPreset,
  setSearch,
  setEstado,
  setEmisorNombre,
  setMoneda,
  setFechaDesde,
  setFechaHasta,
  setMontoMin,
  setMontoMax,
}) => {
  switch (chipKey) {
    case 'dashboardPreset':
      navigate(buildFacturasRoute(returnContext));
      break;
    case 'search':
      setSearch('');
      break;
    case 'estado':
      setEstado('');
      break;
    case 'emisor':
      setEmisorNombre('');
      break;
    case 'moneda':
      setMoneda('');
      break;
    case 'fechaDesde':
      setFechaDesde('');
      break;
    case 'fechaHasta':
      setFechaHasta('');
      break;
    case 'montoMin':
      setMontoMin('');
      break;
    case 'montoMax':
      setMontoMax('');
      break;
    default:
      if (dashboardPreset) {
        navigate(buildFacturasRoute(returnContext));
      }
      break;
  }
};

function Facturas({ sociedadId, canEditContabilizacion = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardPreset = useMemo(
    () => parseDashboardPresetFromSearch(location.search),
    [location.search],
  );
  const returnContext = useMemo(
    () => parseReturnContextFromSearch(location.search),
    [location.search],
  );
  const [showFilters, setShowFilters] = useState(false);

  const {
    search,
    setSearch,
    estado,
    setEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    emisorNombre,
    setEmisorNombre,
    moneda,
    setMoneda,
    montoMin,
    setMontoMin,
    montoMax,
    setMontoMax,
    sortBy,
    sortDir,
    pageSize,
    setPage,
    setPageSize,
    dashboardPreset: activeDashboardPreset,
    query,
    hasActiveFilters,
    resetFilters,
    resetPaginationAndSort,
    toggleSort,
    filterNotaCreditoForReport,
  } = useFacturasFilters({ dashboardPreset });

  const {
    items,
    meta,
    summary,
    loading,
    error,
    refetch,
  } = useFacturas({
    sociedadId,
    query,
  });

  const {
    reportLoading,
    reportError,
    reportMessage,
    exportReport,
  } = useFacturasReport({
    sociedadId,
    query,
    filterNotaCreditoForReport,
  });

  const {
    actionError,
    closeMenu,
    mhLoadingId,
    openMenuId,
    setActionError,
    toggleMenu,
    viewMensajeHacienda,
  } = useFacturaRowActions({
    items,
    resetKey: `${sociedadId || ''}:${dashboardPreset}`,
  });

  useEffect(() => {
    resetPaginationAndSort();
    setShowFilters(false);
  }, [dashboardPreset, resetPaginationAndSort, sociedadId]);

  useEffect(() => {
    if (!sociedadId) {
      setActionError('');
    }
  }, [setActionError, sociedadId]);

  const activeFilterChips = useMemo(() => buildFilterChips({
    dashboardPreset: activeDashboardPreset,
    search,
    estado,
    fechaDesde,
    fechaHasta,
    emisorNombre,
    moneda,
    montoMin,
    montoMax,
  }), [
    activeDashboardPreset,
    emisorNombre,
    estado,
    fechaDesde,
    fechaHasta,
    moneda,
    montoMax,
    montoMin,
    search,
  ]);

  const pages = useMemo(
    () => buildVisiblePages(meta.page, meta.totalPages),
    [meta.page, meta.totalPages],
  );

  const handleResetAllFilters = () => {
    resetFilters();
    if (dashboardPreset) {
      navigate(buildFacturasRoute(returnContext));
    }
  };

  const isInitialLoading = loading && items.length === 0 && !error;
  const hasBlockingError = !sociedadId || (error && items.length === 0);

  if (isInitialLoading) {
    return <LoadingState label={LOADING_LABELS.facturas} />;
  }

  return (
    <div className="documents-page facturas-page">
      <PageHeader
        title={FACTURAS_LABELS.pageTitle}
        subtitle={FACTURAS_LABELS.pageSubtitle}
        actions={(
          <div className="d-flex gap-2">
            {returnContext.returnTo ? (
              <Link className="btn btn-outline-secondary" to={returnContext.returnTo}>
                {getReturnActionLabel(returnContext.returnLabel)}
              </Link>
            ) : null}
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={exportReport}
              disabled={!sociedadId || reportLoading}
            >
              {reportLoading ? FACTURAS_LABELS.exportingReportButton : FACTURAS_LABELS.exportReportButton}
            </button>
          </div>
        )}
      />

      <ActionAlerts error={actionError || reportError} message={reportMessage} className="mb-0" />

      {!sociedadId ? (
        <SectionCard className="table-card">
          <EmptyState className="py-2">{FACTURAS_LABELS.noSociedad}</EmptyState>
        </SectionCard>
      ) : null}

      {sociedadId ? (
        <>
          <FiltersBar className="facturas-toolbar">
            <SearchInput
              placeholder={FACTURAS_LABELS.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="facturas-toolbar-actions">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowFilters((previous) => !previous)}
              >
                {FACTURAS_LABELS.filtersButton}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={handleResetAllFilters}
                disabled={!hasActiveFilters}
              >
                {FACTURAS_LABELS.resetFiltersButton}
              </button>
              {error && items.length > 0 ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={refetch}
                >
                  {FACTURAS_LABELS.retryButton}
                </button>
              ) : null}
            </div>
          </FiltersBar>

          {activeFilterChips.length > 0 ? (
            <div className="facturas-active-filters">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="facturas-filter-chip"
                  onClick={() => clearFilterByKey({
                    chipKey: chip.key,
                    navigate,
                    returnContext,
                    dashboardPreset,
                    setSearch,
                    setEstado,
                    setEmisorNombre,
                    setMoneda,
                    setFechaDesde,
                    setFechaHasta,
                    setMontoMin,
                    setMontoMax,
                  })}
                >
                  <span>{chip.label}</span>
                  <span className="facturas-filter-chip-close">x</span>
                </button>
              ))}
            </div>
          ) : null}

          <FacturasFiltersPanel
            visible={showFilters}
            estado={estado}
            setEstado={setEstado}
            emisorNombre={emisorNombre}
            setEmisorNombre={setEmisorNombre}
            moneda={moneda}
            setMoneda={setMoneda}
            fechaDesde={fechaDesde}
            setFechaDesde={setFechaDesde}
            fechaHasta={fechaHasta}
            setFechaHasta={setFechaHasta}
            montoMin={montoMin}
            setMontoMin={setMontoMin}
            montoMax={montoMax}
            setMontoMax={setMontoMax}
          />

          <FacturasSummaryCards meta={meta} summary={summary} />

          {error && items.length > 0 ? (
            <div className="facturas-inline-error">
              <span>{error}</span>
            </div>
          ) : null}

          {hasBlockingError ? (
            <SectionCard className="table-card">
              <div className="facturas-error-state">
                <strong>{FACTURAS_LABELS.loadingErrorTitle}</strong>
                <p>{error || FACTURAS_LABELS.loadingErrorFallback}</p>
                <button className="btn btn-outline-secondary" type="button" onClick={refetch}>
                  {FACTURAS_LABELS.retryButton}
                </button>
              </div>
            </SectionCard>
          ) : (
            <>
              <SectionCard className="table-card facturas-table-card" bodyClassName="p-0">
                {loading ? (
                  <div className="facturas-table-loading">
                    {FACTURAS_LABELS.updatingTable}
                  </div>
                ) : null}

                <FacturasTable
                  items={items}
                  loading={loading}
                  headers={FACTURAS_TABLE_HEADERS}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  openMenuId={openMenuId}
                  mhLoadingId={mhLoadingId}
                  onToggleMenu={toggleMenu}
                  onCloseMenu={closeMenu}
                  onViewMh={viewMensajeHacienda}
                  canEditContabilizacion={canEditContabilizacion}
                />
              </SectionCard>

              <FacturasPagination
                meta={meta}
                pageSize={pageSize}
                pages={pages}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

export default Facturas;
