import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFacturas } from '../hooks/useFacturas';
import {
  useFacturasFilters,
} from '../hooks/facturas/useFacturasFilters';
import { useFacturasReport } from '../hooks/facturas/useFacturasReport';
import { facturasApi } from '../services/facturasApi.js';
import { formatAmount, formatDate, getMontoDocumento, getMoneda } from '../utils/formatters';
import { estadoClassFactura, estadoLabelFactura } from '../utils/estadosFactura';
import { withAuthToken } from '../utils/auth';
import StatusBadge from './common/StatusBadge';
import EmptyState from './common/EmptyState';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import SectionCard from './common/SectionCard';
import SearchInput from './common/SearchInput';
import FiltersBar from './common/FiltersBar';
import DataTable from './common/DataTable';
import FiltersPanel from './common/FiltersPanel';
import ActionAlerts from './common/ActionAlerts';
import { FACTURAS_LABELS, LOADING_LABELS } from '../utils/uiLabels';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const formatLabel = (template, values) => Object.entries(values).reduce(
  (label, [key, value]) => label.replace(`{${key}}`, String(value)),
  template,
);

const getDocumentoPrincipal = (factura) => (
  factura.consecutivo
  || factura.numero_consecutivo
  || factura.clave
  || `ID ${factura.id}`
);

const getEmisorNombre = (factura) => (
  factura.emisor?.Nombre
  || factura.emisor?.nombre
  || '-'
);

const getEmisorIdentificacion = (factura) => (
  factura.emisor?.Identificacion?.Numero
  || factura.emisor?.identificacion?.numero
  || factura.emisor?.NumeroIdentificacion
  || factura.emisor?.numeroIdentificacion
  || ''
);

const getFacturasSummaryTotal = (summary) => {
  if (!Array.isArray(summary?.byMoneda) || summary.byMoneda.length === 0) {
    return '-';
  }

  return summary.byMoneda
    .map((entry) => `${entry.moneda} ${formatAmount(entry.totalAmount)}`)
    .join('  |  ');
};

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

  if (search.trim()) {
    chips.push({ key: 'search', label: `Busqueda: ${search.trim()}` });
  }
  if (estado) {
    chips.push({ key: 'estado', label: `Estado: ${estadoLabelFactura(estado)}` });
  }
  if (emisorNombre.trim()) {
    chips.push({ key: 'emisor', label: `Emisor: ${emisorNombre.trim()}` });
  }
  if (moneda) {
    chips.push({ key: 'moneda', label: `Moneda: ${moneda}` });
  }
  if (fechaDesde) {
    chips.push({ key: 'fechaDesde', label: `Desde: ${fechaDesde}` });
  }
  if (fechaHasta) {
    chips.push({ key: 'fechaHasta', label: `Hasta: ${fechaHasta}` });
  }
  if (montoMin !== '') {
    chips.push({ key: 'montoMin', label: `Monto min: ${montoMin}` });
  }
  if (montoMax !== '') {
    chips.push({ key: 'montoMax', label: `Monto max: ${montoMax}` });
  }

  return chips;
};

function FacturaRowActions({
  factura,
  openMenuId,
  mhLoadingId,
  onToggleMenu,
  onCloseMenu,
  onViewMh,
  canEditContabilizacion,
}) {
  const isOpen = openMenuId === factura.id;
  const isMhLoading = mhLoadingId === factura.id;
  const actions = [
    {
      key: 'pdf',
      label: FACTURAS_LABELS.actionsMenu.openPdf,
      url: factura.ruta_pdf
        ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(factura.ruta_pdf)}`)
        : '',
      disabled: !factura.ruta_pdf,
    },
    {
      key: 'xml',
      label: FACTURAS_LABELS.actionsMenu.openXml,
      url: factura.ruta_xml
        ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(factura.ruta_xml)}`)
        : '',
      disabled: !factura.ruta_xml,
    },
    {
      key: 'mh',
      label: FACTURAS_LABELS.actionsMenu.viewMh,
      disabled: !factura.has_mensaje_hacienda || isMhLoading,
      onClick: () => onViewMh(factura),
    },
    {
      key: 'manifest',
      label: FACTURAS_LABELS.actionsMenu.viewManifest,
      url: factura.ruta_xml || factura.ruta_pdf
        ? withAuthToken(`/api/facturas/${factura.id}/manifest`)
        : '',
      disabled: !factura.ruta_xml && !factura.ruta_pdf,
    },
  ];

  return (
    <div className="factura-actions" data-factura-menu="true">
      <Link className="btn btn-sm btn-outline-primary" to={`/facturas/${factura.id}/contabilizacion`}>
        {canEditContabilizacion
          ? FACTURAS_LABELS.primaryActionEdit
          : FACTURAS_LABELS.primaryActionReadOnly}
      </Link>
      <div className={`factura-actions-menu${isOpen ? ' open' : ''}`} data-factura-menu="true">
        <button
          className="btn btn-sm btn-light factura-actions-trigger"
          type="button"
          onClick={() => onToggleMenu(factura.id)}
          aria-expanded={isOpen}
          aria-label={FACTURAS_LABELS.actionsButton}
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
                  <span>{FACTURAS_LABELS.actionsMenu.unavailable}</span>
                </button>
              ) : action.onClick ? (
                <button
                  key={action.key}
                  type="button"
                  className="factura-actions-item"
                  role="menuitem"
                  onClick={() => {
                    onCloseMenu();
                    action.onClick();
                  }}
                >
                  {action.label}
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

function Facturas({ sociedadId, canEditContabilizacion = false }) {
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [mhLoadingId, setMhLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');

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
    filterNotaCreditoForReport,
  } = useFacturasFilters();

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

  useEffect(() => {
    resetPaginationAndSort();
    setOpenMenuId(null);
    setMhLoadingId(null);
    setActionError('');
  }, [sociedadId]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [items]);

  const handleViewMh = useCallback(async (factura) => {
    if (!factura?.id || !factura?.has_mensaje_hacienda) {
      return;
    }

    try {
      setMhLoadingId(factura.id);
      setActionError('');

      const response = await facturasApi.getMensajeHacienda(factura.id);
      const rutaXml = response?.data?.data?.ruta_xml;

      if (!rutaXml) {
        setActionError('Mensaje Hacienda sin XML.');
        return;
      }

      const url = withAuthToken(`/api/files/xml?path=${encodeURIComponent(rutaXml)}`);
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const apiError = err?.response?.data?.error || 'Mensaje Hacienda no encontrado.';
      setActionError(apiError);
    } finally {
      setMhLoadingId(null);
    }
  }, []);

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
      label: FACTURAS_LABELS.columns.documento,
    },
    {
      key: 'emisor',
      label: FACTURAS_LABELS.columns.emisor,
      sortable: true,
      sortKey: 'emisor',
    },
    {
      key: 'fecha',
      label: FACTURAS_LABELS.columns.fecha,
      sortable: true,
      sortKey: 'fecha_emision',
    },
    {
      key: 'total',
      label: FACTURAS_LABELS.columns.total,
      sortable: true,
      sortKey: 'total_factura',
      align: 'end',
    },
    {
      key: 'estado',
      label: FACTURAS_LABELS.columns.estado,
      sortable: true,
      sortKey: 'estado',
    },
    {
      key: 'acciones',
      label: FACTURAS_LABELS.columns.acciones,
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

  const handleToggleMenu = (facturaId) => {
    setOpenMenuId((current) => (current === facturaId ? null : facturaId));
  };

  const handleSort = (nextSortBy) => {
    toggleSort(nextSortBy);
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
                onClick={() => setShowFilters((prev) => !prev)}
              >
                {FACTURAS_LABELS.filtersButton}
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={resetFilters}
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
              <label>{FACTURAS_LABELS.filters.estado}</label>
              <select className="form-select" value={estado} onChange={(event) => setEstado(event.target.value)}>
                <option value="">{FACTURAS_LABELS.filters.estadoOptions.all}</option>
                <option value="no_contabilizado">{FACTURAS_LABELS.filters.estadoOptions.no_contabilizado}</option>
                <option value="contabilizado">{FACTURAS_LABELS.filters.estadoOptions.contabilizado}</option>
                <option value="en_revision">{FACTURAS_LABELS.filters.estadoOptions.en_revision}</option>
                <option value="en_tramite_pago">{FACTURAS_LABELS.filters.estadoOptions.en_tramite_pago}</option>
                <option value="pagado_parcialmente">{FACTURAS_LABELS.filters.estadoOptions.pagado_parcialmente}</option>
                <option value="en_aprobacion">{FACTURAS_LABELS.filters.estadoOptions.en_aprobacion}</option>
                <option value="rechazado">{FACTURAS_LABELS.filters.estadoOptions.rechazado}</option>
                <option value="pagado">{FACTURAS_LABELS.filters.estadoOptions.pagado}</option>
              </select>
            </div>
            <div className="filter-item">
              <label>{FACTURAS_LABELS.filters.emisor}</label>
              <input
                className="form-control"
                value={emisorNombre}
                onChange={(event) => setEmisorNombre(event.target.value)}
                placeholder={FACTURAS_LABELS.filters.emisorPlaceholder}
              />
            </div>
            <div className="filter-item">
              <label>{FACTURAS_LABELS.filters.moneda}</label>
              <select className="form-select" value={moneda} onChange={(event) => setMoneda(event.target.value)}>
                <option value="">{FACTURAS_LABELS.filters.monedaOptions.all}</option>
                <option value="CRC">{FACTURAS_LABELS.filters.monedaOptions.CRC}</option>
                <option value="USD">{FACTURAS_LABELS.filters.monedaOptions.USD}</option>
              </select>
            </div>
            <div className="filter-item">
              <label>{FACTURAS_LABELS.filters.desde}</label>
              <input
                type="date"
                className="form-control"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>{FACTURAS_LABELS.filters.hasta}</label>
              <input
                type="date"
                className="form-control"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>{FACTURAS_LABELS.filters.montoMin}</label>
              <input
                type="number"
                className="form-control"
                value={montoMin}
                onChange={(event) => setMontoMin(event.target.value)}
                placeholder={FACTURAS_LABELS.filters.montoMinPlaceholder}
              />
            </div>
            <div className="filter-item">
              <label>{FACTURAS_LABELS.filters.montoMax}</label>
              <input
                type="number"
                className="form-control"
                value={montoMax}
                onChange={(event) => setMontoMax(event.target.value)}
                placeholder={FACTURAS_LABELS.filters.montoMaxPlaceholder}
              />
            </div>
          </FiltersPanel>

          <div className="facturas-summary-grid">
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{FACTURAS_LABELS.resultsSummary}</span>
              <strong className="facturas-summary-value">
                {formatLabel(FACTURAS_LABELS.totalResults, { count: meta.totalItems })}
              </strong>
              <span className="facturas-summary-meta">
                {meta.totalPages > 0
                  ? formatLabel(FACTURAS_LABELS.pageSummary, { page: meta.page, totalPages: meta.totalPages })
                  : 'Sin resultados'}
              </span>
            </div>
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{FACTURAS_LABELS.totalFilteredLabel}</span>
              <strong className="facturas-summary-value">{getFacturasSummaryTotal(summary)}</strong>
              <span className="facturas-summary-meta">{FACTURAS_LABELS.currenciesSummaryTitle}</span>
            </div>
            <div className="facturas-summary-card">
              <span className="facturas-summary-label">{FACTURAS_LABELS.statesSummaryTitle}</span>
              <div className="facturas-summary-chip-list">
                {(summary.byEstado || []).slice(0, 4).map((entry) => (
                  <span key={entry.estado} className="facturas-summary-chip">
                    {estadoLabelFactura(entry.estado)}: {entry.totalItems}
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

                <DataTable
                  headers={tableHeaders}
                  stickyHeader
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  tableClassName="table table-hover align-middle mb-0 facturas-data-table"
                >
                  {items.map((factura) => {
                    const monedaFactura = getMoneda(factura);
                    const montoFactura = getMontoDocumento(factura, { preferAjustado: false });
                    const emisorNombreValue = getEmisorNombre(factura);
                    const emisorIdentificacion = getEmisorIdentificacion(factura);

                    return (
                      <tr key={factura.id}>
                        <td>
                          <div className="factura-document-cell">
                            <div className="factura-document-title">
                              Factura #{getDocumentoPrincipal(factura)}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="factura-emisor-cell" title={emisorNombreValue}>
                            <div className="factura-emisor-name">{emisorNombreValue}</div>
                            <div className="factura-emisor-meta">{emisorIdentificacion || 'Sin identificacion'}</div>
                          </div>
                        </td>
                        <td>
                          <div className="factura-date-cell">
                            <div>{formatDate(factura.fecha_emision)}</div>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="factura-total-cell">
                            <div className="factura-total-amount">{formatAmount(montoFactura)}</div>
                            <div className="factura-total-currency">{monedaFactura}</div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            label={estadoLabelFactura(factura.estado)}
                            className={estadoClassFactura(factura.estado)}
                          />
                        </td>
                        <td className="text-end">
                          <FacturaRowActions
                            factura={factura}
                            openMenuId={openMenuId}
                            mhLoadingId={mhLoadingId}
                            onToggleMenu={handleToggleMenu}
                            onCloseMenu={() => setOpenMenuId(null)}
                            onViewMh={handleViewMh}
                            canEditContabilizacion={canEditContabilizacion}
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && items.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-4">
                        <EmptyState className="text-center py-2">
                          {FACTURAS_LABELS.emptyFilters}
                        </EmptyState>
                      </td>
                    </tr>
                  ) : null}
                </DataTable>
              </SectionCard>

              <div className="pagination-row facturas-pagination">
                <div className="facturas-pagination-meta">
                  <span>{formatLabel(FACTURAS_LABELS.totalResults, { count: meta.totalItems })}</span>
                  <label className="facturas-page-size">
                    <span>{FACTURAS_LABELS.pageSizeLabel}</span>
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
                    {FACTURAS_LABELS.paginationPrevious}
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
                    {FACTURAS_LABELS.paginationNext}
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

export default Facturas;
