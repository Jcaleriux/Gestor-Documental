import { formatAmount, formatDate, getMoneda } from '../../utils/formatters.js';
import { TIQUETES_ELECTRONICOS_LABELS } from '../../utils/uiLabels.js';
import DataTable from '../common/DataTable.jsx';
import EmptyState from '../common/EmptyState.jsx';
import TiqueteRowActions from './TiqueteRowActions.jsx';
import {
  getDocumentoPrincipal,
  getEmisorNombre,
} from './tiquetesPageHelpers.js';

function TiquetesTable({
  items,
  loading,
  headers,
  sortBy,
  sortDir,
  onSort,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
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
                onToggleMenu={onToggleMenu}
                onCloseMenu={onCloseMenu}
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
  );
}

export default TiquetesTable;
