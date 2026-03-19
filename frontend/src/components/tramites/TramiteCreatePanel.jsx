import { useCallback, useEffect, useState } from 'react';
import { formatAmount, getMoneda, getMontoDocumento } from '../../utils/formatters';
import { extractMensajeHaciendaXmlPath, facturasApi } from '../../services/facturasApi.js';
import { withAuthToken } from '../../utils/auth.js';
import SectionCard from '../common/SectionCard';
import ActionAlerts from '../common/ActionAlerts';
import LoadingState from '../common/LoadingState';
import FiltersSection from '../common/FiltersSection';
import DataTable from '../common/DataTable';
import EmptyState from '../common/EmptyState';
import { FACTURAS_LABELS, TRAMITES_LABELS, LOADING_LABELS } from '../../utils/uiLabels';

const getMontoRetencion = (row) => {
  const monto = Number(row?.monto_retencion_pendiente ?? row?.monto_retencion ?? 0);
  return Number.isFinite(monto) ? monto : 0;
};

function FacturaTramiteRowActions({
  factura,
  sociedadId,
  openMenuId,
  mhLoadingId,
  onToggleMenu,
  onCloseMenu,
  onViewMh,
}) {
  const isOpen = openMenuId === factura.id;
  const isMhLoading = mhLoadingId === factura.id;
  const primaryUrlSearch = new URLSearchParams({ readonly: '1' });

  if (sociedadId) {
    primaryUrlSearch.set('sociedad', String(sociedadId));
  }

  const primaryUrl = `/facturas/${factura.id}/contabilizacion?${primaryUrlSearch.toString()}`;
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
      {primaryUrl ? (
        <a
          className="btn btn-sm btn-outline-primary"
          href={primaryUrl}
          target="_blank"
          rel="noreferrer"
        >
          Ver
        </a>
      ) : (
        <button className="btn btn-sm btn-outline-secondary" type="button" disabled>
          Ver
        </button>
      )}
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

function TramiteCreatePanel({
  showCreate,
  canCreateTramite,
  sociedadId,
  closeCreate,
  actionError,
  actionMessage,
  setActionError,
  loadingDocs,
  createFilters,
  updateCreateFilter,
  monedasDisponibles,
  facturasFiltradas,
  retencionesFiltradas,
  selectedFacturas,
  selectedRetenciones,
  onToggleFactura,
  onToggleRetencion,
  totalFacturasSeleccionadas,
  totalRetencionesSeleccionadas,
  totalSeleccionado,
  totalPorMoneda,
  marcarTodosVisibles,
  desmarcarTodos,
  crearTramite
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [mhLoadingId, setMhLoadingId] = useState(null);

  const handleViewMh = useCallback(async (factura) => {
    if (!factura?.id || !factura?.has_mensaje_hacienda) {
      return;
    }

    try {
      setMhLoadingId(factura.id);
      setActionError?.('');

      const response = await facturasApi.getMensajeHacienda(factura.id);
      const rutaXml = extractMensajeHaciendaXmlPath(response);

      if (!rutaXml) {
        setActionError?.('Mensaje Hacienda sin XML.');
        return;
      }

      const url = withAuthToken(`/api/files/xml?path=${encodeURIComponent(rutaXml)}`);
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const apiError = err?.response?.data?.error || 'Mensaje Hacienda no encontrado.';
      setActionError?.(apiError);
    } finally {
      setMhLoadingId(null);
    }
  }, [setActionError]);

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

  if (!showCreate || !canCreateTramite) {
    return null;
  }

  const resumenMoneda = Object.entries(totalPorMoneda).length === 0
    ? ''
    : Object.entries(totalPorMoneda)
      .map(([moneda, total]) => `${moneda}: ${formatAmount(total)}`)
      .join(' - ');
  const totalItemsVisibles = facturasFiltradas.length + retencionesFiltradas.length;

  return (
    <SectionCard
      className="table-card tramite-create-card"
      bodyClassName=""
      title={TRAMITES_LABELS.createTitle}
      actions={(
        <button className="btn btn-light" type="button" onClick={closeCreate}>
          {TRAMITES_LABELS.createClose}
        </button>
      )}
    >
      <div className="tramite-create-header">
        <div>
          <p className="tramite-create-subtitle">{TRAMITES_LABELS.createSubtitle}</p>
        </div>
        <div className="tramite-actions">
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={marcarTodosVisibles}
            disabled={totalItemsVisibles === 0}
          >
            {TRAMITES_LABELS.createMarkAll}
          </button>
          <button
            className="btn btn-light btn-sm"
            type="button"
            onClick={desmarcarTodos}
            disabled={selectedFacturas.size === 0 && selectedRetenciones.size === 0}
          >
            {TRAMITES_LABELS.createClearAll}
          </button>
        </div>
      </div>

      <div className="small text-muted">
        {TRAMITES_LABELS.createSelectionHelper.replace('{count}', String(totalItemsVisibles))}
      </div>

      <ActionAlerts error={actionError} message={actionMessage} />

      {loadingDocs ? (
        <LoadingState label={LOADING_LABELS.facturasDisponibles} />
      ) : (
        <>
          <FiltersSection>
            <div className="tramite-filter-item">
              <label>{TRAMITES_LABELS.filters.create.emisor}</label>
              <input
                className="form-control"
                value={createFilters.filtroEmisor}
                onChange={(event) => updateCreateFilter('filtroEmisor')(event.target.value)}
                placeholder={TRAMITES_LABELS.filters.create.emisorPlaceholder}
              />
            </div>
            <div className="tramite-filter-item">
              <label>{TRAMITES_LABELS.filters.create.proveedorRetencion}</label>
              <input
                className="form-control"
                value={createFilters.filtroProveedorRetencion}
                onChange={(event) => updateCreateFilter('filtroProveedorRetencion')(event.target.value)}
                placeholder={TRAMITES_LABELS.filters.create.proveedorRetencionPlaceholder}
              />
            </div>
            <div className="tramite-filter-item">
              <label>{TRAMITES_LABELS.filters.create.montoMin}</label>
              <input
                type="number"
                className="form-control"
                value={createFilters.filtroMontoMin}
                onChange={(event) => updateCreateFilter('filtroMontoMin')(event.target.value)}
                placeholder={TRAMITES_LABELS.filters.create.montoMinPlaceholder}
              />
            </div>
            <div className="tramite-filter-item">
              <label>{TRAMITES_LABELS.filters.create.montoMax}</label>
              <input
                type="number"
                className="form-control"
                value={createFilters.filtroMontoMax}
                onChange={(event) => updateCreateFilter('filtroMontoMax')(event.target.value)}
                placeholder={TRAMITES_LABELS.filters.create.montoMaxPlaceholder}
              />
            </div>
            <div className="tramite-filter-item">
              <label>{TRAMITES_LABELS.filters.create.moneda}</label>
              <select
                className="form-select"
                value={createFilters.filtroMoneda}
                onChange={(event) => updateCreateFilter('filtroMoneda')(event.target.value)}
              >
                <option value="">{TRAMITES_LABELS.filters.create.monedaAll}</option>
                {monedasDisponibles.map((moneda) => (
                  <option key={moneda} value={moneda}>
                    {moneda}
                  </option>
                ))}
              </select>
            </div>
          </FiltersSection>

          <div className="small fw-semibold text-muted mb-2">Facturas</div>
          <DataTable
            headers={[
              '',
              'Factura',
              'Emisor',
              'Moneda',
              'Monto a pagar',
              'Fecha',
              'Acciones'
            ]}
          >
            {facturasFiltradas.map((factura) => (
              <tr key={factura.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedFacturas.has(factura.id)}
                    onChange={() => onToggleFactura(factura.id)}
                  />
                </td>
                <td className="fw-semibold">#{factura.consecutivo || factura.numero_consecutivo}</td>
                <td>{factura.emisor?.Nombre || factura.emisor?.nombre || '-'}</td>
                <td>{getMoneda(factura)}</td>
                <td>{formatAmount(getMontoDocumento(factura, { preferAjustado: true }))}</td>
                <td>{factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString() : '-'}</td>
                <td className="text-end">
                  <FacturaTramiteRowActions
                    factura={factura}
                    sociedadId={sociedadId}
                    openMenuId={openMenuId}
                    mhLoadingId={mhLoadingId}
                    onToggleMenu={(facturaId) => setOpenMenuId((current) => (current === facturaId ? null : facturaId))}
                    onCloseMenu={() => setOpenMenuId(null)}
                    onViewMh={handleViewMh}
                  />
                </td>
              </tr>
            ))}
            {facturasFiltradas.length === 0 && (
              <tr>
                <td colSpan="7" className="py-4">
                  <EmptyState className="text-center py-2">
                    {TRAMITES_LABELS.createEmptyFilters}
                  </EmptyState>
                </td>
              </tr>
            )}
          </DataTable>

          <div className="small fw-semibold text-muted mt-4 mb-2">Retenciones pendientes</div>
          <div className="small text-muted mb-2">
            Solo se muestran retenciones de facturas en estado pagado.
          </div>
          <DataTable
            headers={[
              '',
              'Proveedor',
              'Factura',
              'Moneda',
              'Monto retencion',
              'Fecha factura'
            ]}
          >
            {retencionesFiltradas.map((retencion) => (
              <tr key={`ret-${retencion.factura_id}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRetenciones.has(retencion.factura_id)}
                    onChange={() => onToggleRetencion(retencion.factura_id)}
                  />
                </td>
                <td>
                  <div>{retencion.proveedor_nombre || 'Sin proveedor'}</div>
                  <div className="text-muted small">{retencion.proveedor_identificacion || '-'}</div>
                </td>
                <td className="fw-semibold">#{retencion.consecutivo || retencion.clave || retencion.factura_id}</td>
                <td>{retencion.moneda || 'CRC'}</td>
                <td>{formatAmount(getMontoRetencion(retencion))}</td>
                <td>{retencion.fecha_emision ? new Date(retencion.fecha_emision).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {retencionesFiltradas.length === 0 && (
              <tr>
                <td colSpan="6" className="py-4">
                  <EmptyState className="text-center py-2">
                    Sin retenciones disponibles para los filtros seleccionados.
                  </EmptyState>
                </td>
              </tr>
            )}
          </DataTable>
        </>
      )}

      <div className="tramite-create-footer">
        <div className="text-muted">
          Facturas: {selectedFacturas.size} ({formatAmount(totalFacturasSeleccionadas)}) - Retenciones: {selectedRetenciones.size} ({formatAmount(totalRetencionesSeleccionadas)}) - Total: {formatAmount(totalSeleccionado)}
          {resumenMoneda && <span> - {resumenMoneda}</span>}
        </div>
        <button className="btn btn-primary" type="button" onClick={crearTramite}>
          Crear tramite
        </button>
      </div>
    </SectionCard>
  );
}

export default TramiteCreatePanel;
