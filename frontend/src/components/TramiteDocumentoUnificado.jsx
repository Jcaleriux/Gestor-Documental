import { formatAmount, formatDate, getMoneda, getMontoDocumento } from '../utils/formatters';
import {
  estadoClassTramite,
  decisionLabel,
  decisionClass
} from '../utils/estadosTramite';
import EmptyState from './common/EmptyState';
import StatusBadge from './common/StatusBadge';
import SectionCard from './common/SectionCard';
import TramiteActions from './TramiteActions';
import { TRAMITES_ACTION_LABELS } from '../utils/uiLabels';

function TramiteDocumentoUnificado({
  doc,
  pdfUrl,
  offset = 0,
  puedeGerencia,
  puedeGerenciaContable,
  puedeFinanciera,
  puedeTesoreria,
  destinosTesoreria,
  destinoSeleccionado,
  onDestinoChange,
  onDecision,
  onAccionTesoreria
}) {
  return (
    <div style={{ marginLeft: `${offset}px` }}>
      <SectionCard className="mb-3">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div className="fw-semibold">Factura #{doc.consecutivo || doc.clave}</div>
            <div className="text-muted small">
              {doc.emisor?.Nombre || doc.emisor?.nombre || '-'}
            </div>
            <div className="text-muted small">
              {getMoneda(doc)} - {formatAmount(getMontoDocumento(doc, { preferAjustado: true }))}
            </div>
          </div>
          <TramiteActions
            facturaId={doc.factura_id}
            puedeGerencia={puedeGerencia}
            puedeGerenciaContable={puedeGerenciaContable}
            puedeFinanciera={puedeFinanciera}
            puedeTesoreria={puedeTesoreria}
            destinosTesoreria={destinosTesoreria}
            destinoSeleccionado={destinoSeleccionado}
            onDestinoChange={onDestinoChange}
            onDecision={onDecision}
            onAccionTesoreria={onAccionTesoreria}
            isExcluido={doc.estado_tesoreria === 'excluido'}
            showReincluir={false}
            className="d-flex flex-wrap gap-2"
            labels={TRAMITES_ACTION_LABELS}
          />
        </div>
        <div className="d-flex flex-wrap gap-2 mt-2">
          <StatusBadge
            label={`Estado: ${doc.estado ? doc.estado.replace(/_/g, ' ') : 'sin estado'}`}
            className={estadoClassTramite(doc.estado)}
          />
          <StatusBadge
            label={`Gerencia: ${decisionLabel(doc.estado_gerencia)}`}
            className={decisionClass(doc.estado_gerencia)}
          />
          <StatusBadge
            label={`G. Contable: ${decisionLabel(doc.estado_gerencia_contable)}`}
            className={decisionClass(doc.estado_gerencia_contable)}
          />
          <StatusBadge
            label={`Financiera: ${decisionLabel(doc.estado_financiero)}`}
            className={decisionClass(doc.estado_financiero)}
          />
        </div>
        <div className="row g-3 mt-1">
          <div className="col-12 col-lg-4">
            <div className="small text-muted">Centro de costo</div>
            <div>{doc.conta_centro_costo || '-'}</div>
            <div className="small text-muted mt-2">Cuenta contable</div>
            <div>{doc.conta_cuenta_contable || '-'}</div>
            <div className="small text-muted mt-2">Proyecto</div>
            <div>{doc.conta_proyecto || '-'}</div>
            <div className="small text-muted mt-2">Orden de compra</div>
            <div>{doc.conta_orden_compra || '-'}</div>
            <div className="small text-muted mt-2">Numero proveedor</div>
            <div>{doc.conta_numero_proveedor || '-'}</div>
            <div className="small text-muted mt-2">Plazo credito (dias)</div>
            <div>{doc.conta_plazo_credito ?? '-'}</div>
            <div className="small text-muted mt-2">Retencion</div>
            <div>{doc.conta_retencion != null ? formatAmount(doc.conta_retencion) : '-'}</div>
            <div className="small text-muted mt-2">Descuento</div>
            <div>{doc.conta_descuento != null ? formatAmount(doc.conta_descuento) : '-'}</div>
            <div className="small text-muted mt-2">Anticipo aplicado</div>
            <div>{doc.conta_anticipo_aplicado != null ? formatAmount(doc.conta_anticipo_aplicado) : '-'}</div>
            <div className="small text-muted mt-2">Monto nota de credito</div>
            <div>{doc.conta_monto_nota_credito != null ? formatAmount(doc.conta_monto_nota_credito) : '-'}</div>
            <div className="small text-muted mt-2">Total factura</div>
            <div>{doc.total_factura != null ? formatAmount(doc.total_factura) : '-'}</div>
            <div className="small text-muted mt-2">Total a pagar</div>
            <div>{doc.total_a_pagar != null ? formatAmount(doc.total_a_pagar) : '-'}</div>
            <div className="small text-muted mt-2">Total pagado principal</div>
            <div>{doc.total_pagado_principal != null ? formatAmount(doc.total_pagado_principal) : '-'}</div>
            <div className="small text-muted mt-2">Fecha documento</div>
            <div>{formatDate(doc.conta_fecha_documento)}</div>
            <div className="small text-muted mt-2">Fecha vencimiento</div>
            <div>{formatDate(doc.conta_fecha_vencimiento)}</div>
            <div className="small text-muted mt-2">Fecha contabilizacion</div>
            <div>{formatDate(doc.conta_fecha_contabilizacion)}</div>
            <div className="small text-muted mt-2">Notas</div>
            <div>{doc.conta_notas || '-'}</div>
          </div>
          <div className="col-12 col-lg-8">
            {pdfUrl ? (
              <iframe
                title={`PDF ${doc.factura_id}`}
                src={pdfUrl}
                style={{ width: '100%', height: '560px', border: '1px solid #e6ebf2' }}
              />
            ) : (
              <EmptyState className="py-2">PDF no disponible.</EmptyState>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default TramiteDocumentoUnificado;
