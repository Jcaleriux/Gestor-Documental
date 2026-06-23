import {
  formatAmount,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
  getMoneda,
  getMontoDocumento,
} from '../utils/formatters';
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
  enEtapaGerencia,
  puedeVerGerencia,
  puedeGerencia,
  puedeGerenciaContable,
  puedeFinanciera,
  puedeTesoreria,
  sociedadId,
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

  const buildGerenciaSummary = (doc) => {
    const totalAprobadores = Number(doc.gerencia_aprobadores_total || 0);
    if (totalAprobadores <= 0) {
      return [];
    }

    const aprobados = Number(doc.gerencia_aprobadores_aprobados || 0);
    const pendientes = Array.isArray(doc.gerencia_aprobadores)
      ? doc.gerencia_aprobadores
        .filter((item) => item?.estado === 'pendiente')
        .map((item) => item?.aprobador_label || item?.rol_aprobador_nombre || item?.rol_aprobador_codigo || item?.usuario_aprobador_nombre || item?.usuario_aprobador_email || '')
        .filter(Boolean)
      : [];

    const summaryLines = [`${aprobados}/${totalAprobadores} aprobadores`];
    if (doc.gerencia_ya_aprobo_usuario_actual) {
      summaryLines.push('Tu aprobacion ya fue registrada.');
    }
    if (pendientes.length > 0) {
      const visiblePendientes = pendientes.slice(0, 2).join(', ');
      summaryLines.push(
        pendientes.length > 2
          ? `Pendientes: ${visiblePendientes}...`
          : `Pendientes: ${visiblePendientes}`
      );
    }

    return summaryLines;
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
          <th>Financiera</th>
          <th>Gestion tesoreria</th>
          <th className="text-end">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {documentos.map((doc) => {
          const isExcluido = doc.estado_tesoreria === 'excluido';
          const isDevueltoContabilidad = doc.estado_tesoreria === 'devuelto_contabilidad';
          const totalAprobadoresGerencia = Number(doc.gerencia_aprobadores_total || 0);
          const gerenciaGestionadaPorCentro = totalAprobadoresGerencia > 0;
          const puedeGerenciaDocumento = enEtapaGerencia && (
            gerenciaGestionadaPorCentro
              ? doc.gerencia_puede_aprobar_usuario_actual
                && !doc.gerencia_ya_aprobo_usuario_actual
                && doc.estado_gerencia === 'pendiente'
              : puedeGerencia
          );
          const puedeGerenciaContableDocumento =
            puedeGerenciaContable && doc.estado_gerencia_contable === 'pendiente';
          const puedeFinancieraDocumento =
            puedeFinanciera && doc.estado_financiero === 'pendiente';
          const gerenciaSummary = buildGerenciaSummary(doc);
          const documentoVisible = getDocumentoConsecutivo(doc);
          const documentoCompleto = getDocumentoConsecutivoCompleto(doc);

          return (
            <tr key={doc.factura_id}>
              <td className="fw-semibold" title={documentoCompleto}>#{documentoVisible}</td>
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
                {puedeVerGerencia && gerenciaSummary.map((summaryLine) => (
                  <div key={`${doc.factura_id}-${summaryLine}`} className="small text-muted mt-1">
                    {summaryLine}
                  </div>
                ))}
              </td>
              <td>
                <StatusBadge
                  label={decisionLabel(doc.estado_gerencia_contable)}
                  className={decisionClass(doc.estado_gerencia_contable)}
                />
              </td>
              <td>
                <StatusBadge
                  label={decisionLabel(doc.estado_financiero)}
                  className={decisionClass(doc.estado_financiero)}
                />
              </td>
              <td>
                <StatusBadge
                  label={tesoreriaLabel(doc.estado_tesoreria)}
                  className={tesoreriaClass(doc.estado_tesoreria)}
                />
              </td>
              <td className="text-end">
                <TramiteActions
                  facturaId={doc.factura_id}
                  puedeGerencia={puedeGerenciaDocumento}
                  puedeGerenciaContable={puedeGerenciaContableDocumento}
                  puedeFinanciera={puedeFinancieraDocumento}
                  puedeTesoreria={puedeTesoreria}
                  sociedadId={sociedadId}
                  destinosTesoreria={destinosTesoreria}
                  destinoSeleccionado={tesoreriaDestino[doc.factura_id]}
                  onDestinoChange={onDestinoChange}
                  onDecision={onDecision}
                  onAccionTesoreria={onAccionTesoreria}
                  isExcluido={isExcluido}
                  isDevueltoContabilidad={isDevueltoContabilidad}
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
