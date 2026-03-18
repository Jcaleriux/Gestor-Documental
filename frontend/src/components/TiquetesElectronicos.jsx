import { useEffect, useMemo, useState } from 'react';
import { useTiquetesElectronicos } from '../hooks/useTiquetesElectronicos';
import { useTiquetesElectronicosFilters } from '../hooks/tiquetes/useTiquetesElectronicosFilters';
import { formatAmount, formatDate, getMoneda } from '../utils/formatters';
import { withAuthToken } from '../utils/auth';
import DataTable from './common/DataTable';
import EmptyState from './common/EmptyState';
import FiltersBar from './common/FiltersBar';
import FiltersPanel from './common/FiltersPanel';
import LoadingState from './common/LoadingState';
import PageHeader from './common/PageHeader';
import SearchInput from './common/SearchInput';
import SectionCard from './common/SectionCard';
import { LOADING_LABELS, TIQUETES_ELECTRONICOS_LABELS } from '../utils/uiLabels';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const formatLabel = (template, values) => Object.entries(values).reduce(
  (label, [key, value]) => label.replace(`{${key}}`, String(value)),
  template,
);

const buildVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : [];
  }

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
  if (currentPage - 2 > 1) pages.add(currentPage - 2);
  if (currentPage + 2 < totalPages) pages.add(currentPage + 2);

  const ordered = Array.from(pages).sort((a, b) => a - b);
  const result = [];

  ordered.forEach((pageNumber, index) => {
    const previous = ordered[index - 1];
    if (previous && pageNumber - previous > 1) {
      result.push(`ellipsis-${previous}-${pageNumber}`);
    }
    result.push(pageNumber);
  });

  return result;
};

const buildFilterChips = ({
  search,
  fechaDesde,
  fechaHasta,
  emisorNombre,
  moneda,
  montoMin,
  montoMax,
}) => {
  const chips = [];

  if (search.trim()) chips.push({ key: 'search', label: `Busqueda: ${search.trim()}` });
  if (emisorNombre.trim()) chips.push({ key: 'emisor', label: `Emisor: ${emisorNombre.trim()}` });
  if (moneda) chips.push({ key: 'moneda', label: `Moneda: ${moneda}` });
  if (fechaDesde) chips.push({ key: 'fechaDesde', label: `Desde: ${fechaDesde}` });
  if (fechaHasta) chips.push({ key: 'fechaHasta', label: `Hasta: ${fechaHasta}` });
  if (montoMin !== '') chips.push({ key: 'montoMin', label: `Monto min: ${montoMin}` });
  if (montoMax !== '') chips.push({ key: 'montoMax', label: `Monto max: ${montoMax}` });

  return chips;
};

const getDocumentoPrincipal = (tiquete) => (
  tiquete.consecutivo
  || tiquete.numero_consecutivo
  || tiquete.id
  || '-'
);

const getEmisorNombre = (tiquete) => (
  tiquete.emisor?.Nombre
  || tiquete.emisor?.nombre
  || '-'
);

const getSummaryByMoneda = (summary) => {
  if (!Array.isArray(summary?.byMoneda) || summary.byMoneda.length === 0) {
    return '-';
  }

  return summary.byMoneda
    .map((entry) => `${entry.moneda} ${formatAmount(entry.totalAmount)}`)
    .join('  |  ');
};

function TiqueteRowActions({
  tiquete,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
}) {
  const isOpen = openMenuId === tiquete.id;
  const pdfUrl = tiquete.ruta_pdf
    ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(tiquete.ruta_pdf)}`)
    : '';
  const xmlUrl = tiquete.ruta_xml
    ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(tiquete.ruta_xml)}`)
    : '';

  return (
    <div className="factura-actions" data-factura-menu="true">
      {pdfUrl ? (
        <a
          className="btn btn-sm btn-outline-primary"
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
        >
          {TIQUETES_ELECTRONICOS_LABELS.primaryAction}
        </a>
      ) : (
        <button className="btn btn-sm btn-outline-secondary" type="button" disabled>
          {TIQUETES_ELECTRONICOS_LABELS.primaryAction}
        </button>
      )}
      <div className={`factura-actions-menu${isOpen ? ' open' : ''}`} data-factura-menu="true">
        <button
          className="btn btn-sm btn-light factura-actions-trigger"
          type="button"
          onClick={() => onToggleMenu(tiquete.id)}
          aria-expanded={isOpen}
          aria-label={TIQUETES_ELECTRONICOS_LABELS.actionsButton}
        >
          ...
        </button>
        {isOpen ? (
          <div className="factura-actions-popover" role="menu" data-factura-menu="true">
            {xmlUrl ? (
              <a
                className="factura-actions-item"
                href={xmlUrl}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                onClick={onCloseMenu}
              >
                {TIQUETES_ELECTRONICOS_LABELS.actionsMenu.openXml}
              </a>
            ) : (
              <button
                type="button"
                className="factura-actions-item disabled"
                disabled
              >
                <span>{TIQUETES_ELECTRONICOS_LABELS.actionsMenu.openXml}</span>
                <span>{TIQUETES_ELECTRONICOS_LABELS.actionsMenu.unavailable}</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TiquetesElectronicos({ sociedadId }) {
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

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
    page,
    setPage,
    pageSize,
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

  useEffect(() => {
    resetPaginationAndSort();
    setOpenMenuId(null);
  }, [sociedadId]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [items]);

  useEffect(() => {
    if (!openMenuId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.target?.closest?.('[data-factura-menu="true"]')) {
        return;
      }
      setOpenMenuId(null);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openMenuId]);

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

  const pages = useMemo(() => buildVisiblePages(meta.page, meta.totalPages), [meta.page, meta.totalPages]);

  const tableHeaders = useMemo(() => ([
    {
      key: 'documento',
      label: TIQUETES_ELECTRONICOS_LABELS.columns.documento,
    },
    {
      key: 'emisor',
      label: TIQUETES_ELECTRONICOS_LABELS.columns.emisor,
      sortable: true,
      sortKey: 'emisor',
    },
    {
      key: 'fecha',
      label: TIQUETES_ELECTRONICOS_LABELS.columns.fecha,
      sortable: true,
      sortKey: 'fecha_emision',
    },
    {
      key: 'total',
      label: TIQUETES_ELECTRONICOS_LABELS.columns.total,
      sortable: true,
      sortKey: 'monto',
      align: 'end',
    },
    {
      key: 'acciones',
      label: TIQUETES_ELECTRONICOS_LABELS.columns.acciones,
      align: 'end',
    },
  ]), []);

  const clearFilterChip = (chipKey) => {
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
                onClick={() => setShowFilters((prev) => !prev)}
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
                  onClick={() => clearFilterChip(chip.key)}
                >
                  <span>{chip.label}</span>
                  <span className="facturas-filter-chip-close">x</span>
                </button>
              ))}
            </div>
          ) : null}

          <FiltersPanel visible={showFilters} className="facturas-filters-panel">
            <div className="filter-item">
              <label>{TIQUETES_ELECTRONICOS_LABELS.filters.emisor}</label>
              <input
                className="form-control"
                value={emisorNombre}
                onChange={(event) => setEmisorNombre(event.target.value)}
                placeholder={TIQUETES_ELECTRONICOS_LABELS.filters.emisorPlaceholder}
              />
            </div>
            <div className="filter-item">
              <label>{TIQUETES_ELECTRONICOS_LABELS.filters.moneda}</label>
              <select className="form-select" value={moneda} onChange={(event) => setMoneda(event.target.value)}>
                <option value="">{TIQUETES_ELECTRONICOS_LABELS.filters.monedaOptions.all}</option>
                <option value="CRC">{TIQUETES_ELECTRONICOS_LABELS.filters.monedaOptions.CRC}</option>
                <option value="USD">{TIQUETES_ELECTRONICOS_LABELS.filters.monedaOptions.USD}</option>
              </select>
            </div>
            <div className="filter-item">
              <label>{TIQUETES_ELECTRONICOS_LABELS.filters.desde}</label>
              <input
                type="date"
                className="form-control"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>{TIQUETES_ELECTRONICOS_LABELS.filters.hasta}</label>
              <input
                type="date"
                className="form-control"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>{TIQUETES_ELECTRONICOS_LABELS.filters.montoMin}</label>
              <input
                type="number"
                className="form-control"
                value={montoMin}
                onChange={(event) => setMontoMin(event.target.value)}
                placeholder={TIQUETES_ELECTRONICOS_LABELS.filters.montoMinPlaceholder}
              />
            </div>
            <div className="filter-item">
              <label>{TIQUETES_ELECTRONICOS_LABELS.filters.montoMax}</label>
              <input
                type="number"
                className="form-control"
                value={montoMax}
                onChange={(event) => setMontoMax(event.target.value)}
                placeholder={TIQUETES_ELECTRONICOS_LABELS.filters.montoMaxPlaceholder}
              />
            </div>
          </FiltersPanel>

          <div className="facturas-summary-grid tiquetes-summary-grid">
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{TIQUETES_ELECTRONICOS_LABELS.resultsSummary}</span>
              <strong className="facturas-summary-value">
                {formatLabel(TIQUETES_ELECTRONICOS_LABELS.totalResults, { count: meta.totalItems })}
              </strong>
              <span className="facturas-summary-meta">
                {meta.totalPages > 0
                  ? formatLabel(TIQUETES_ELECTRONICOS_LABELS.pageSummary, { page: meta.page, totalPages: meta.totalPages })
                  : 'Sin resultados'}
              </span>
            </div>
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{TIQUETES_ELECTRONICOS_LABELS.totalFilteredLabel}</span>
              <strong className="facturas-summary-value">{getSummaryByMoneda(summary)}</strong>
              <span className="facturas-summary-meta">{TIQUETES_ELECTRONICOS_LABELS.currenciesSummaryTitle}</span>
            </div>
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{TIQUETES_ELECTRONICOS_LABELS.currenciesSummaryTitle}</span>
              <div className="facturas-summary-chip-list">
                {(summary.byMoneda || []).slice(0, 4).map((entry) => (
                  <span key={entry.moneda} className="facturas-summary-chip">
                    {entry.moneda}: {entry.totalItems}
                  </span>
                ))}
                {(summary.byMoneda || []).length === 0 ? (
                  <span className="facturas-summary-meta">Sin datos</span>
                ) : null}
              </div>
            </div>
          </div>

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

                <DataTable
                  headers={tableHeaders}
                  stickyHeader
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={(nextSortBy) => toggleSort(nextSortBy)}
                  tableClassName="table table-hover align-middle mb-0 facturas-data-table"
                >
                  {items.map((tiquete) => {
                    const monedaTiquete = tiquete.moneda || getMoneda(tiquete);
                    const emisorNombreValue = getEmisorNombre(tiquete);

                    return (
                      <tr key={tiquete.id}>
                        <td>
                          <div className="factura-document-cell">
                            <div className="factura-document-title">
                              Tiquete #{getDocumentoPrincipal(tiquete)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="factura-emisor-cell" title={emisorNombreValue}>
                            <div className="factura-emisor-name">{emisorNombreValue}</div>
                          </div>
                        </td>
                        <td>
                          <div className="factura-date-cell">
                            <div>{formatDate(tiquete.fecha_emision)}</div>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="factura-total-cell">
                            <div className="factura-total-amount">{formatAmount(tiquete.monto_total)}</div>
                            <div className="factura-total-currency">{monedaTiquete}</div>
                          </div>
                        </td>
                        <td className="text-end">
                          <TiqueteRowActions
                            tiquete={tiquete}
                            openMenuId={openMenuId}
                            onToggleMenu={(tiqueteId) => setOpenMenuId((current) => (current === tiqueteId ? null : tiqueteId))}
                            onCloseMenu={() => setOpenMenuId(null)}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && items.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-4">
                        <EmptyState className="text-center py-2">
                          {TIQUETES_ELECTRONICOS_LABELS.emptyFilters}
                        </EmptyState>
                      </td>
                    </tr>
                  ) : null}
                </DataTable>
              </SectionCard>

              <div className="pagination-row facturas-pagination">
                <div className="facturas-pagination-meta">
                  <span>{formatLabel(TIQUETES_ELECTRONICOS_LABELS.totalResults, { count: meta.totalItems })}</span>
                  <label className="facturas-page-size">
                    <span>{TIQUETES_ELECTRONICOS_LABELS.pageSizeLabel}</span>
                    <select
                      className="form-select form-select-sm"
                      value={pageSize}
                      onChange={(event) => setPageSize(event.target.value)}
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="pagination-pages facturas-pagination-pages">
                  <button
                    className="btn btn-light"
                    type="button"
                    onClick={() => setPage(page - 1)}
                    disabled={!meta.hasPrev}
                  >
                    {TIQUETES_ELECTRONICOS_LABELS.paginationPrevious}
                  </button>

                  {pages.map((pageItem) => (
                    typeof pageItem === 'string' ? (
                      <span key={pageItem} className="facturas-pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={pageItem}
                        className={`btn ${pageItem === meta.page ? 'btn-primary' : 'btn-outline-secondary'}`}
                        type="button"
                        onClick={() => setPage(pageItem)}
                      >
                        {pageItem}
                      </button>
                    )
                  ))}

                  <button
                    className="btn btn-light"
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={!meta.hasNext}
                  >
                    {TIQUETES_ELECTRONICOS_LABELS.paginationNext}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

export default TiquetesElectronicos;
