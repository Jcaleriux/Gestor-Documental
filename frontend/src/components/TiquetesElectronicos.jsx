import { useEffect, useMemo, useState } from 'react';
import { useTiquetesElectronicos } from '../hooks/useTiquetesElectronicos.js';
import { useTiqueteRowActions } from '../hooks/tiquetes/useTiqueteRowActions.js';
import { useTiquetesElectronicosFilters } from '../hooks/tiquetes/useTiquetesElectronicosFilters.js';
import EmptyState from './common/EmptyState.jsx';
import FiltersBar from './common/FiltersBar.jsx';
import LoadingState from './common/LoadingState.jsx';
import PageHeader from './common/PageHeader.jsx';
import SearchInput from './common/SearchInput.jsx';
import SectionCard from './common/SectionCard.jsx';
import TiquetesFiltersPanel from './tiquetes/TiquetesFiltersPanel.jsx';
import TiquetesPagination from './tiquetes/TiquetesPagination.jsx';
import TiquetesSummaryCards from './tiquetes/TiquetesSummaryCards.jsx';
import TiquetesTable from './tiquetes/TiquetesTable.jsx';
import {
  TIQUETES_TABLE_HEADERS,
  buildFilterChips,
  buildVisiblePages,
} from './tiquetes/tiquetesPageHelpers.js';
import { LOADING_LABELS, TIQUETES_ELECTRONICOS_LABELS } from '../utils/uiLabels.js';

const clearFilterByKey = ({
  chipKey,
  setSearch,
  setEmisorNombre,
  setMoneda,
  setFechaDesde,
  setFechaHasta,
  setMontoMin,
  setMontoMax,
}) => {
  switch (chipKey) {
    case 'search':
      setSearch('');
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
      break;
  }
};

function TiquetesElectronicos({ sociedadId }) {
  const [showFilters, setShowFilters] = useState(false);

  const {
    search,
    setSearch,
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
    query,
    hasActiveFilters,
    resetFilters,
    resetPaginationAndSort,
    toggleSort,
  } = useTiquetesElectronicosFilters();

  const {
    items,
    meta,
    summary,
    loading,
    error,
    refetch,
  } = useTiquetesElectronicos({
    sociedadId,
    query,
  });

  const {
    closeMenu,
    openMenuId,
    toggleMenu,
  } = useTiqueteRowActions({
    items,
    resetKey: String(sociedadId || ''),
  });

  useEffect(() => {
    resetPaginationAndSort();
    setShowFilters(false);
  }, [resetPaginationAndSort, sociedadId]);

  const activeFilterChips = useMemo(() => buildFilterChips({
    search,
    fechaDesde,
    fechaHasta,
    emisorNombre,
    moneda,
    montoMin,
    montoMax,
  }), [
    emisorNombre,
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

  const isInitialLoading = loading && items.length === 0 && !error;
  const hasBlockingError = !sociedadId || (error && items.length === 0);

  if (isInitialLoading) {
    return <LoadingState label={LOADING_LABELS.tiquetesElectronicos} />;
  }

  return (
    <div className="documents-page facturas-page">
      <PageHeader
        title={TIQUETES_ELECTRONICOS_LABELS.pageTitle}
        subtitle={TIQUETES_ELECTRONICOS_LABELS.pageSubtitle}
      />

      {!sociedadId ? (
        <SectionCard className="table-card">
          <EmptyState className="py-2">{TIQUETES_ELECTRONICOS_LABELS.noSociedad}</EmptyState>
        </SectionCard>
      ) : null}

      {sociedadId ? (
        <>
          <FiltersBar className="facturas-toolbar">
            <SearchInput
              placeholder={TIQUETES_ELECTRONICOS_LABELS.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="facturas-toolbar-actions">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowFilters((previous) => !previous)}
              >
                {TIQUETES_ELECTRONICOS_LABELS.filtersButton}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                {TIQUETES_ELECTRONICOS_LABELS.resetFiltersButton}
              </button>
              {error && items.length > 0 ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={refetch}
                >
                  {TIQUETES_ELECTRONICOS_LABELS.retryButton}
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
                    setSearch,
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

          <TiquetesFiltersPanel
            visible={showFilters}
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

          <TiquetesSummaryCards meta={meta} summary={summary} />

          {error && items.length > 0 ? (
            <div className="facturas-inline-error">
              <span>{error}</span>
            </div>
          ) : null}

          {hasBlockingError ? (
            <SectionCard className="table-card">
              <div className="facturas-error-state">
                <strong>{TIQUETES_ELECTRONICOS_LABELS.loadingErrorTitle}</strong>
                <p>{error || TIQUETES_ELECTRONICOS_LABELS.loadingErrorFallback}</p>
                <button className="btn btn-outline-secondary" type="button" onClick={refetch}>
                  {TIQUETES_ELECTRONICOS_LABELS.retryButton}
                </button>
              </div>
            </SectionCard>
          ) : (
            <>
              <SectionCard className="table-card facturas-table-card" bodyClassName="p-0">
                {loading ? (
                  <div className="facturas-table-loading">
                    {TIQUETES_ELECTRONICOS_LABELS.updatingTable}
                  </div>
                ) : null}

                <TiquetesTable
                  items={items}
                  loading={loading}
                  headers={TIQUETES_TABLE_HEADERS}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  openMenuId={openMenuId}
                  onToggleMenu={toggleMenu}
                  onCloseMenu={closeMenu}
                />
              </SectionCard>

              <TiquetesPagination
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

export default TiquetesElectronicos;
