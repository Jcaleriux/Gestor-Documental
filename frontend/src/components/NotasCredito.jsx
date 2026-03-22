import { useEffect, useMemo, useState } from 'react';
import { useNotasCredito } from '../hooks/useNotasCredito.js';
import { useNotasCreditoFilters } from '../hooks/notasCredito/useNotasCreditoFilters.js';
import { useNotaCreditoRowActions } from '../hooks/notasCredito/useNotaCreditoRowActions.js';
import { useNotasCreditoReport } from '../hooks/notasCredito/useNotasCreditoReport.js';
import ActionAlerts from './common/ActionAlerts.jsx';
import EmptyState from './common/EmptyState.jsx';
import FiltersBar from './common/FiltersBar.jsx';
import LoadingState from './common/LoadingState.jsx';
import PageHeader from './common/PageHeader.jsx';
import SearchInput from './common/SearchInput.jsx';
import SectionCard from './common/SectionCard.jsx';
import NotasCreditoFiltersPanel from './notasCredito/NotasCreditoFiltersPanel.jsx';
import NotasCreditoPagination from './notasCredito/NotasCreditoPagination.jsx';
import NotasCreditoSummaryCards from './notasCredito/NotasCreditoSummaryCards.jsx';
import NotasCreditoTable from './notasCredito/NotasCreditoTable.jsx';
import {
  NOTAS_CREDITO_TABLE_HEADERS,
  buildFilterChips,
  buildVisiblePages,
} from './notasCredito/notasCreditoPageHelpers.js';
import {
  buildNotasCreditoViewScope,
  buildScopedPanelVisible,
} from './notasCredito/notasCreditoUiState.js';
import { LOADING_LABELS, NOTAS_CREDITO_LABELS } from '../utils/uiLabels.js';

const clearFilterByKey = ({
  chipKey,
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
      break;
  }
};

function NotasCredito({ sociedadId }) {
  const viewScope = useMemo(() => buildNotasCreditoViewScope({
    sociedadId,
  }), [sociedadId]);
  const [filtersPanelState, setFiltersPanelState] = useState(() => ({
    scope: viewScope,
    visible: false,
  }));
  const showFilters = useMemo(() => buildScopedPanelVisible({
    scope: viewScope,
    state: filtersPanelState,
  }), [filtersPanelState, viewScope]);

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
    query,
    hasActiveFilters,
    resetFilters,
    resetPaginationAndSort,
    toggleSort,
  } = useNotasCreditoFilters();

  const {
    items,
    meta,
    summary,
    loading,
    error,
    refetch,
  } = useNotasCredito({
    sociedadId,
    query,
  });

  const {
    reportLoading,
    reportError,
    reportMessage,
    exportReport,
  } = useNotasCreditoReport({
    sociedadId,
    query,
  });

  const {
    closeMenu,
    openMenuId,
    toggleMenu,
  } = useNotaCreditoRowActions({
    items,
    resetKey: String(sociedadId || ''),
  });

  useEffect(() => {
    resetPaginationAndSort();
  }, [resetPaginationAndSort, sociedadId]);

  const activeFilterChips = useMemo(() => buildFilterChips({
    search,
    estado,
    fechaDesde,
    fechaHasta,
    emisorNombre,
    moneda,
    montoMin,
    montoMax,
  }), [
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

  const isInitialLoading = loading && items.length === 0 && !error;
  const hasBlockingError = !sociedadId || (error && items.length === 0);

  if (isInitialLoading) {
    return <LoadingState label={LOADING_LABELS.notasCredito} />;
  }

  return (
    <div className="documents-page facturas-page">
      <PageHeader
        title={NOTAS_CREDITO_LABELS.pageTitle}
        subtitle={NOTAS_CREDITO_LABELS.pageSubtitle}
        actions={(
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={exportReport}
              disabled={!sociedadId || reportLoading}
            >
              {reportLoading ? NOTAS_CREDITO_LABELS.exportingReportButton : NOTAS_CREDITO_LABELS.exportReportButton}
            </button>
          </div>
        )}
      />

      <ActionAlerts error={reportError} message={reportMessage} className="mb-0" />

      {!sociedadId ? (
        <SectionCard className="table-card">
          <EmptyState className="py-2">{NOTAS_CREDITO_LABELS.noSociedad}</EmptyState>
        </SectionCard>
      ) : null}

      {sociedadId ? (
        <>
          <FiltersBar className="facturas-toolbar">
            <SearchInput
              placeholder={NOTAS_CREDITO_LABELS.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="facturas-toolbar-actions">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setFiltersPanelState({
                  scope: viewScope,
                  visible: !showFilters,
                })}
              >
                {NOTAS_CREDITO_LABELS.filtersButton}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                {NOTAS_CREDITO_LABELS.resetFiltersButton}
              </button>
              {error && items.length > 0 ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={refetch}
                >
                  {NOTAS_CREDITO_LABELS.retryButton}
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

          <NotasCreditoFiltersPanel
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

          <NotasCreditoSummaryCards meta={meta} summary={summary} />

          {error && items.length > 0 ? (
            <div className="facturas-inline-error">
              <span>{error}</span>
            </div>
          ) : null}

          {hasBlockingError ? (
            <SectionCard className="table-card">
              <div className="facturas-error-state">
                <strong>{NOTAS_CREDITO_LABELS.loadingErrorTitle}</strong>
                <p>{error || NOTAS_CREDITO_LABELS.loadingErrorFallback}</p>
                <button className="btn btn-outline-secondary" type="button" onClick={refetch}>
                  {NOTAS_CREDITO_LABELS.retryButton}
                </button>
              </div>
            </SectionCard>
          ) : (
            <>
              <SectionCard className="table-card facturas-table-card" bodyClassName="p-0">
                {loading ? (
                  <div className="facturas-table-loading">
                    {NOTAS_CREDITO_LABELS.updatingTable}
                  </div>
                ) : null}

                <NotasCreditoTable
                  items={items}
                  loading={loading}
                  headers={NOTAS_CREDITO_TABLE_HEADERS}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  openMenuId={openMenuId}
                  onToggleMenu={toggleMenu}
                  onCloseMenu={closeMenu}
                />
              </SectionCard>

              <NotasCreditoPagination
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

export default NotasCredito;
