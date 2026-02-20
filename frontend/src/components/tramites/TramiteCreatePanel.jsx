import { Link } from 'react-router-dom';
import { formatAmount, getMoneda, getMontoDocumento } from '../../utils/formatters';
import SectionCard from '../common/SectionCard';
import ActionAlerts from '../common/ActionAlerts';
import LoadingState from '../common/LoadingState';
import FiltersSection from '../common/FiltersSection';
import DataTable from '../common/DataTable';
import EmptyState from '../common/EmptyState';
import { TRAMITES_LABELS, LOADING_LABELS } from '../../utils/uiLabels';

const getMontoRetencion = (row) => {
  const monto = Number(row?.monto_retencion_pendiente ?? row?.monto_retencion ?? 0);
  return Number.isFinite(monto) ? monto : 0;
};

function TramiteCreatePanel({
  showCreate,
  canCreateTramite,
  closeCreate,
  actionError,
  actionMessage,
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
  crearTramite
}) {
  if (!showCreate || !canCreateTramite) {
    return null;
  }

  const resumenMoneda = Object.entries(totalPorMoneda).length === 0
    ? ''
    : Object.entries(totalPorMoneda)
      .map(([moneda, total]) => `${moneda}: ${formatAmount(total)}`)
      .join(' - ');

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
                  <Link className="btn btn-sm btn-outline-primary" to={`/facturas/${factura.id}`}>
                    Ver
                  </Link>
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
