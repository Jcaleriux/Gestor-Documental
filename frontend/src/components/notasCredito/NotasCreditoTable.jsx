import { formatAmount, formatDate, getMoneda } from '../../utils/formatters.js';
import { estadoClassNotaCredito, estadoLabelNotaCredito } from '../../utils/estadosNotaCredito.js';
import { NOTAS_CREDITO_LABELS } from '../../utils/uiLabels.js';
import DataTable from '../common/DataTable.jsx';
import EmptyState from '../common/EmptyState.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import NotaCreditoRowActions from './NotaCreditoRowActions.jsx';
import {
  formatLabel,
  getDocumentoPrincipal,
  getEmisorNombre,
} from './notasCreditoPageHelpers.js';

function NotasCreditoTable({
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
                onToggleMenu={onToggleMenu}
                onCloseMenu={onCloseMenu}
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
  );
}

export default NotasCreditoTable;
