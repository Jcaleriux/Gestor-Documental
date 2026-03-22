import { formatAmount, formatDate, getMontoDocumento, getMoneda } from '../../utils/formatters.js';
import { estadoClassFactura, estadoLabelFactura } from '../../utils/estadosFactura.js';
import { FACTURAS_LABELS } from '../../utils/uiLabels.js';
import DataTable from '../common/DataTable.jsx';
import EmptyState from '../common/EmptyState.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import FacturaRowActions from './FacturaRowActions.jsx';
import {
  getDocumentoPrincipal,
  getEmisorIdentificacion,
  getEmisorNombre,
} from './facturasPageHelpers.js';

function FacturasTable({
  items,
  loading,
  headers,
  sortBy,
  sortDir,
  onSort,
  openMenuId,
  mhLoadingId,
  onToggleMenu,
  onCloseMenu,
  onViewMh,
  canEditContabilizacion,
}) {
  return (
    <DataTable
      headers={headers}
      stickyHeader
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
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
                onToggleMenu={onToggleMenu}
                onCloseMenu={onCloseMenu}
                onViewMh={onViewMh}
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
  );
}

export default FacturasTable;
