import { useEffect, useMemo, useState } from 'react';
import { useNotasCredito } from '../hooks/useNotasCredito';
import { useNotasCreditoFilters } from '../hooks/notasCredito/useNotasCreditoFilters';
import { useNotasCreditoReport } from '../hooks/notasCredito/useNotasCreditoReport';
import { formatAmount, formatDate, getMoneda } from '../utils/formatters';
import { estadoClassNotaCredito, estadoLabelNotaCredito } from '../utils/estadosNotaCredito';
import { withAuthToken } from '../utils/auth';
import ActionAlerts from './common/ActionAlerts';
import DataTable from './common/DataTable';
import EmptyState from './common/EmptyState';
import FiltersBar from './common/FiltersBar';
import FiltersPanel from './common/FiltersPanel';
import LoadingState from './common/LoadingState';
import PageHeader from './common/PageHeader';
import SearchInput from './common/SearchInput';
import SectionCard from './common/SectionCard';
import StatusBadge from './common/StatusBadge';
import { LOADING_LABELS, NOTAS_CREDITO_LABELS } from '../utils/uiLabels';

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
  estado,
  fechaDesde,
  fechaHasta,
  emisorNombre,
  moneda,
  montoMin,
  montoMax,
}) => {
  const chips = [];

  if (search.trim()) chips.push({ key: 'search', label: `Busqueda: ${search.trim()}` });
  if (estado) chips.push({ key: 'estado', label: `Estado: ${estadoLabelNotaCredito(estado)}` });
  if (emisorNombre.trim()) chips.push({ key: 'emisor', label: `Emisor: ${emisorNombre.trim()}` });
  if (moneda) chips.push({ key: 'moneda', label: `Moneda: ${moneda}` });
  if (fechaDesde) chips.push({ key: 'fechaDesde', label: `Desde: ${fechaDesde}` });
  if (fechaHasta) chips.push({ key: 'fechaHasta', label: `Hasta: ${fechaHasta}` });
  if (montoMin !== '') chips.push({ key: 'montoMin', label: `Monto min: ${montoMin}` });
  if (montoMax !== '') chips.push({ key: 'montoMax', label: `Monto max: ${montoMax}` });

  return chips;
};

const getDocumentoPrincipal = (nota) => (
  nota.numero_consecutivo
  || nota.consecutivo
  || nota.id
  || '-'
);

const getEmisorNombre = (nota) => (
  nota.emisor?.Nombre
  || nota.emisor?.nombre
  || '-'
);

const getSummaryByMoneda = (summary, fieldName) => {
  if (!Array.isArray(summary?.byMoneda) || summary.byMoneda.length === 0) {
    return '-';
  }

  return summary.byMoneda
    .map((entry) => `${entry.moneda} ${formatAmount(entry[fieldName] || 0)}`)
    .join('  |  ');
};

function NotaCreditoRowActions({
  nota,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
}) {
  const isOpen = openMenuId === nota.id;
  const pdfUrl = nota.ruta_pdf
    ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(nota.ruta_pdf)}`)
    : '';
  const actions = [
    {
      key: 'xml',
      label: NOTAS_CREDITO_LABELS.actionsMenu.openXml,
      url: nota.ruta_xml
        ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(nota.ruta_xml)}`)
        : '',
      disabled: !nota.ruta_xml,
    },
    {
      key: 'manifest',
      label: NOTAS_CREDITO_LABELS.actionsMenu.viewManifest,
      url: nota.ruta_xml || nota.ruta_pdf
        ? withAuthToken(`/api/notas-credito/${nota.id}/manifest`)
        : '',
      disabled: !nota.ruta_xml && !nota.ruta_pdf,
    },
  ];

  return (
    <div className="factura-actions" data-factura-menu="true">
      {pdfUrl ? (
        <a
          className="btn btn-sm btn-outline-primary"
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
        >
          {NOTAS_CREDITO_LABELS.primaryAction}
        </a>
      ) : (
        <button className="btn btn-sm btn-outline-secondary" type="button" disabled>
          {NOTAS_CREDITO_LABELS.primaryAction}
        </button>
      )}
      <div className={`factura-actions-menu${isOpen ? ' open' : ''}`} data-factura-menu="true">
        <button
          className="btn btn-sm btn-light factura-actions-trigger"
          type="button"
          onClick={() => onToggleMenu(nota.id)}
          aria-expanded={isOpen}
          aria-label={NOTAS_CREDITO_LABELS.actionsButton}
        >
          ...
        </button>
        {isOpen ? (
          <div className="factura-actions-popover" role="menu" data-factura-menu="true">
            {actions.map((action) => (
              action.disabled ? (
                <button
                  key={action.key}
                  type="button"
                  className="factura-actions-item disabled"
                  disabled
                >
                  <span>{action.label}</span>
                  <span>{NOTAS_CREDITO_LABELS.actionsMenu.unavailable}</span>
                </button>
              ) : (
                <a
                  key={action.key}
                  className="factura-actions-item"
                  href={action.url}
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  onClick={onCloseMenu}
                >
                  {action.label}
                </a>
              )
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NotasCredito({ sociedadId }) {
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

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
    page,
    setPage,
    pageSize,
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

  const pages = useMemo(() => buildVisiblePages(meta.page, meta.totalPages), [meta.page, meta.totalPages]);

  const tableHeaders = useMemo(() => ([
    {
      key: 'documento',
      label: NOTAS_CREDITO_LABELS.columns.documento,
    },
    {
      key: 'emisor',
      label: NOTAS_CREDITO_LABELS.columns.emisor,
      sortable: true,
      sortKey: 'emisor',
    },
    {
      key: 'fecha',
      label: NOTAS_CREDITO_LABELS.columns.fecha,
      sortable: true,
      sortKey: 'fecha_emision',
    },
    {
      key: 'total',
      label: NOTAS_CREDITO_LABELS.columns.total,
      sortable: true,
      sortKey: 'monto',
      align: 'end',
    },
    {
      key: 'estado',
      label: NOTAS_CREDITO_LABELS.columns.estado,
      sortable: true,
      sortKey: 'estado',
    },
    {
      key: 'acciones',
      label: NOTAS_CREDITO_LABELS.columns.acciones,
      align: 'end',
    },
  ]), []);

  const clearFilterChip = (chipKey) => {
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
                onClick={() => setShowFilters((prev) => !prev)}
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
              <label>{NOTAS_CREDITO_LABELS.filters.estado}</label>
              <select className="form-select" value={estado} onChange={(event) => setEstado(event.target.value)}>
                <option value="">{NOTAS_CREDITO_LABELS.filters.estadoOptions.all}</option>
                <option value="disponible">{NOTAS_CREDITO_LABELS.filters.estadoOptions.disponible}</option>
                <option value="aplicada">{NOTAS_CREDITO_LABELS.filters.estadoOptions.aplicada}</option>
              </select>
            </div>
            <div className="filter-item">
              <label>{NOTAS_CREDITO_LABELS.filters.emisor}</label>
              <input
                className="form-control"
                value={emisorNombre}
                onChange={(event) => setEmisorNombre(event.target.value)}
                placeholder={NOTAS_CREDITO_LABELS.filters.emisorPlaceholder}
              />
            </div>
            <div className="filter-item">
              <label>{NOTAS_CREDITO_LABELS.filters.moneda}</label>
              <select className="form-select" value={moneda} onChange={(event) => setMoneda(event.target.value)}>
                <option value="">{NOTAS_CREDITO_LABELS.filters.monedaOptions.all}</option>
                <option value="CRC">{NOTAS_CREDITO_LABELS.filters.monedaOptions.CRC}</option>
                <option value="USD">{NOTAS_CREDITO_LABELS.filters.monedaOptions.USD}</option>
              </select>
            </div>
            <div className="filter-item">
              <label>{NOTAS_CREDITO_LABELS.filters.desde}</label>
              <input
                type="date"
                className="form-control"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>{NOTAS_CREDITO_LABELS.filters.hasta}</label>
              <input
                type="date"
                className="form-control"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>{NOTAS_CREDITO_LABELS.filters.montoMin}</label>
              <input
                type="number"
                className="form-control"
                value={montoMin}
                onChange={(event) => setMontoMin(event.target.value)}
                placeholder={NOTAS_CREDITO_LABELS.filters.montoMinPlaceholder}
              />
            </div>
            <div className="filter-item">
              <label>{NOTAS_CREDITO_LABELS.filters.montoMax}</label>
              <input
                type="number"
                className="form-control"
                value={montoMax}
                onChange={(event) => setMontoMax(event.target.value)}
                placeholder={NOTAS_CREDITO_LABELS.filters.montoMaxPlaceholder}
              />
            </div>
          </FiltersPanel>

          <div className="facturas-summary-grid">
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.resultsSummary}</span>
              <strong className="facturas-summary-value">
                {formatLabel(NOTAS_CREDITO_LABELS.totalResults, { count: meta.totalItems })}
              </strong>
              <span className="facturas-summary-meta">
                {meta.totalPages > 0
                  ? formatLabel(NOTAS_CREDITO_LABELS.pageSummary, { page: meta.page, totalPages: meta.totalPages })
                  : 'Sin resultados'}
              </span>
            </div>
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.totalFilteredLabel}</span>
              <strong className="facturas-summary-value">{getSummaryByMoneda(summary, 'totalAmount')}</strong>
              <span className="facturas-summary-meta">{NOTAS_CREDITO_LABELS.currenciesSummaryTitle}</span>
            </div>
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.saldoDisponibleLabel}</span>
              <strong className="facturas-summary-value">{getSummaryByMoneda(summary, 'totalSaldoDisponible')}</strong>
              <span className="facturas-summary-meta">Disponible para aplicar</span>
            </div>
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{NOTAS_CREDITO_LABELS.statesSummaryTitle}</span>
              <div className="facturas-summary-chip-list">
                {(summary.byEstado || []).slice(0, 4).map((entry) => (
                  <span key={entry.estado} className="facturas-summary-chip">
                    {estadoLabelNotaCredito(entry.estado)}: {entry.totalItems}
                  </span>
                ))}
                {(summary.byEstado || []).length === 0 ? (
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

                <DataTable
                  headers={tableHeaders}
                  stickyHeader
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={(nextSortBy) => toggleSort(nextSortBy)}
                  tableClassName="table table-hover align-middle mb-0 facturas-data-table"
                >
                  {items.map((nota) => {
                    const monedaNota = nota.moneda || getMoneda(nota);
                    const emisorNombreValue = getEmisorNombre(nota);

                    return (
                      <tr key={nota.id}>
                        <td>
                          <div className="factura-document-cell">
                            <div className="factura-document-title">
                              Nota de credito #{getDocumentoPrincipal(nota)}
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
                            <div>{formatDate(nota.fecha_emision)}</div>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="factura-total-cell">
                            <div className="factura-total-amount">{formatAmount(nota.monto_total ?? nota.monto)}</div>
                            <div className="factura-total-currency">{monedaNota}</div>
                          </div>
                        </td>
                        <td>
                          <div className="nota-estado-cell">
                            <StatusBadge
                              label={estadoLabelNotaCredito(nota.estado)}
                              className={estadoClassNotaCredito(nota.estado)}
                            />
                            {Number(nota.total_aplicado) > 0 && Number(nota.saldo_disponible) > 0 ? (
                              <div className="nota-estado-meta">
                                {formatLabel(NOTAS_CREDITO_LABELS.saldoHint, {
                                  moneda: monedaNota,
                                  monto: formatAmount(nota.saldo_disponible),
                                })}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="text-end">
                          <NotaCreditoRowActions
                            nota={nota}
                            openMenuId={openMenuId}
                            onToggleMenu={(notaId) => setOpenMenuId((current) => (current === notaId ? null : notaId))}
                            onCloseMenu={() => setOpenMenuId(null)}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && items.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-4">
                        <EmptyState className="text-center py-2">
                          {NOTAS_CREDITO_LABELS.emptyFilters}
                        </EmptyState>
                      </td>
                    </tr>
                  ) : null}
                </DataTable>
              </SectionCard>

              <div className="pagination-row facturas-pagination">
                <div className="facturas-pagination-meta">
                  <span>{formatLabel(NOTAS_CREDITO_LABELS.totalResults, { count: meta.totalItems })}</span>
                  <label className="facturas-page-size">
                    <span>{NOTAS_CREDITO_LABELS.pageSizeLabel}</span>
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
                    {NOTAS_CREDITO_LABELS.paginationPrevious}
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
                    {NOTAS_CREDITO_LABELS.paginationNext}
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

export default NotasCredito;
