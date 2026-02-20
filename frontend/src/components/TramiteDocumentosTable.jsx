import { formatAmount, getMoneda, getMontoDocumento } from '../utils/formatters';
import {
  estadoClassTramite,
  decisionLabel,
  decisionClass,
  tesoreriaLabel,
  tesoreriaClass
} from '../utils/estadosTramite';
import EmptyState from './common/EmptyState';
import StatusBadge from './common/StatusBadge';
import TramiteActions from './TramiteActions';
import { TRAMITES_ACTION_LABELS } from '../utils/uiLabels';

function TramiteDocumentosTable({
  documentos,
  puedeGerencia,
  puedeGerenciaContable,
  puedeFinanciera,
  puedeTesoreria,
  destinosTesoreria,
  tesoreriaDestino,
  onDestinoChange,
  onDecision,
  onAccionTesoreria,
  labels
}) {
  const tableLabels = labels || {
    empty: 'No hay documentos asociados al tramite.'
  };
  return (
    <table className="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>Factura</th>
          <th>Emisor</th>
          <th>Moneda</th>
          <th>Monto a pagar</th>
          <th>Estado</th>
          <th>Gerencia</th>
          <th>G. Contable</th>
          <th>Revision</th>
          <th>Financiera</th>
          <th className="text-end">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {documentos.map((doc) => {
          const isExcluido = doc.estado_tesoreria === 'excluido';
          return (
            <tr key={doc.factura_id}>
              <td className="fw-semibold">#{doc.consecutivo || doc.clave}</td>
              <td>{doc.emisor?.Nombre || doc.emisor?.nombre || '-'}</td>
              <td>{getMoneda(doc)}</td>
              <td>{formatAmount(getMontoDocumento(doc, { preferAjustado: true }))}</td>
              <td>
                <StatusBadge
                  label={doc.estado ? doc.estado.replace(/_/g, ' ') : 'sin estado'}
                  className={estadoClassTramite(doc.estado)}
                />
              </td>
              <td>
                <StatusBadge
                  label={decisionLabel(doc.estado_gerencia)}
                  className={decisionClass(doc.estado_gerencia)}
                />
              </td>
              <td>
                <StatusBadge
                  label={decisionLabel(doc.estado_gerencia_contable)}
                  className={decisionClass(doc.estado_gerencia_contable)}
                />
              </td>
              <td>
                <StatusBadge
                  label={tesoreriaLabel(doc.estado_tesoreria)}
                  className={tesoreriaClass(doc.estado_tesoreria)}
                />
              </td>
              <td>
                <StatusBadge
                  label={decisionLabel(doc.estado_financiero)}
                  className={decisionClass(doc.estado_financiero)}
                />
              </td>
              <td className="text-end">
                <TramiteActions
                  facturaId={doc.factura_id}
                  puedeGerencia={puedeGerencia}
                  puedeGerenciaContable={puedeGerenciaContable}
                  puedeFinanciera={puedeFinanciera}
                  puedeTesoreria={puedeTesoreria}
                  destinosTesoreria={destinosTesoreria}
                  destinoSeleccionado={tesoreriaDestino[doc.factura_id]}
                  onDestinoChange={onDestinoChange}
                  onDecision={onDecision}
                  onAccionTesoreria={onAccionTesoreria}
                  isExcluido={isExcluido}
                  showReincluir
                  labels={TRAMITES_ACTION_LABELS}
                />
              </td>
            </tr>
          );
        })}
        {documentos.length === 0 && (
          <tr>
            <td colSpan="10" className="py-4">
              <EmptyState className="text-center py-2">
                {tableLabels.empty}
              </EmptyState>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default TramiteDocumentosTable;
