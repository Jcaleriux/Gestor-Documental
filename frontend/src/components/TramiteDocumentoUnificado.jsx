import { useMemo, useState } from 'react';
import {
  formatAmount,
  formatConsecutivo,
  formatDate,
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
import SectionCard from './common/SectionCard';
import TramiteActions from './TramiteActions';
import { TRAMITES_ACTION_LABELS } from '../utils/uiLabels';
import { useProtectedObjectUrl } from '../hooks/useProtectedObjectUrl.js';
import { openProtectedInNewTab } from '../utils/protectedResources.js';
import { withPdfFitToWidth } from '../utils/pdfViewer.js';
import { ensureCentrosCostoMetadata, formatCentroCostoLabel } from '../utils/centrosCosto.js';

const buildProtectedPdfUrl = (rutaPdf) => (
  rutaPdf ? `/api/files/pdf?path=${encodeURIComponent(rutaPdf)}` : ''
);

function ProtectedPdfFrame({ resourceUrl, title, unavailableMessage, height = '560px' }) {
  const {
    objectUrl: pdfPreviewUrl,
    error: pdfPreviewError,
    loading: pdfPreviewLoading,
  } = useProtectedObjectUrl(resourceUrl);

  if (!resourceUrl) {
    return <EmptyState className="py-2">{unavailableMessage}</EmptyState>;
  }

  if (pdfPreviewLoading) {
    return <div className="small text-muted">Cargando PDF...</div>;
  }

  if (!pdfPreviewUrl) {
    return <EmptyState className="py-2">{pdfPreviewError || unavailableMessage}</EmptyState>;
  }

  return (
    <iframe
      title={title}
      src={withPdfFitToWidth(pdfPreviewUrl)}
      style={{ width: '100%', height, border: '1px solid #e6ebf2', borderRadius: '12px' }}
    />
  );
}

function TramiteDocumentoPdfResource({
  resource,
  expandedByDefault = false
}) {
  const [expanded, setExpanded] = useState(() => Boolean(expandedByDefault));

  return (
    <div className="border rounded p-3 bg-white mt-3">
      <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <div>
          <div className="fw-semibold small">{resource.label}</div>
          {resource.caption ? <div className="small text-muted">{resource.caption}</div> : null}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => openProtectedInNewTab(resource.resourceUrl)}
            disabled={!resource.resourceUrl}
          >
            Abrir en pestana nueva
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setExpanded((prev) => !prev)}
            disabled={!resource.resourceUrl}
          >
            {expanded ? 'Ocultar' : 'Expandir'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3">
          <ProtectedPdfFrame
            resourceUrl={resource.resourceUrl}
            title={resource.title}
            unavailableMessage={resource.unavailableMessage}
            height={resource.height || '420px'}
          />
        </div>
      )}
    </div>
  );
}

const buildSupportingPdfResources = (doc) => {
  const resources = [];

  if (doc?.conta_tabla_pago_ruta_pdf) {
    resources.push({
      key: `tabla-${doc.factura_id}`,
      label: 'Tabla de pagos',
      caption: doc.conta_tabla_pago_nombre || 'Tabla asociada',
      resourceUrl: buildProtectedPdfUrl(doc.conta_tabla_pago_ruta_pdf),
      title: `Tabla de pagos ${doc.factura_id}`,
      unavailableMessage: 'Tabla de pagos no disponible.'
    });
  }

  if (doc?.conta_orden_compra_ruta_pdf) {
    resources.push({
      key: `orden-${doc.factura_id}`,
      label: 'Orden de compra',
      caption: doc.conta_orden_compra_nombre || doc.conta_orden_compra || 'Orden asociada',
      resourceUrl: buildProtectedPdfUrl(doc.conta_orden_compra_ruta_pdf),
      title: `Orden de compra ${doc.factura_id}`,
      unavailableMessage: 'Orden de compra no disponible.'
    });
  }

  if (doc?.conta_nota_credito_ruta_pdf) {
    resources.push({
      key: `nota-${doc.factura_id}`,
      label: 'Nota de credito',
      caption: formatConsecutivo(doc.conta_nota_credito_clave, `Nota #${doc.conta_nota_credito_id || doc.factura_id}`),
      resourceUrl: buildProtectedPdfUrl(doc.conta_nota_credito_ruta_pdf),
      title: `Nota de credito ${doc.factura_id}`,
      unavailableMessage: 'Nota de credito no disponible.'
    });
  }

  if (Array.isArray(doc?.conta_documentos_respaldo)) {
    doc.conta_documentos_respaldo
      .filter((item) => item?.ruta_pdf)
      .forEach((item) => {
        resources.push({
          key: `respaldo-${doc.factura_id}-${item.id}`,
          label: 'Documento de respaldo',
          caption: item.nombre_archivo || `Respaldo #${item.id}`,
          resourceUrl: buildProtectedPdfUrl(item.ruta_pdf),
          title: `Documento de respaldo ${item.nombre_archivo || item.id}`,
          unavailableMessage: 'Documento de respaldo no disponible.'
        });
      });
  }

  return resources;
};

const buildCentroCostoLabels = (doc) => {
  const metadata = ensureCentrosCostoMetadata(doc?.conta_metadata || {});
  const labels = Array.isArray(metadata.centros_costo_lineas)
    ? metadata.centros_costo_lineas
      .filter((linea) => linea?.centro_costo_id || linea?.codigo || linea?.nombre)
      .map((linea) => formatCentroCostoLabel(linea))
      .filter(Boolean)
    : [];

  const uniqueLabels = Array.from(new Set(labels));
  if (uniqueLabels.length > 0) {
    return uniqueLabels;
  }

  if (doc?.conta_centro_costo) {
    return [doc.conta_centro_costo];
  }

  return [];
};

function TramiteDocumentoUnificado({
  doc,
  pdfUrl,
  sequenceNumber,
  expanded = false,
  onToggleExpanded,
  expandAllResources = false,
  enEtapaGerencia,
  puedeVerGerencia,
  puedeGerencia,
  puedeGerenciaContable,
  puedeFinanciera,
  puedeTesoreria,
  sociedadId,
  destinosTesoreria,
  destinoSeleccionado,
  onDestinoChange,
  onDecision,
  onAccionTesoreria
}) {
  const totalAprobadoresGerencia = Number(doc.gerencia_aprobadores_total || 0);
  const gerenciaGestionadaPorCentro = totalAprobadoresGerencia > 0;
  const gerenciaPendientes = Array.isArray(doc.gerencia_aprobadores)
    ? doc.gerencia_aprobadores
      .filter((item) => item?.estado === 'pendiente')
      .map((item) => item?.aprobador_label || item?.rol_aprobador_nombre || item?.rol_aprobador_codigo || item?.usuario_aprobador_nombre || item?.usuario_aprobador_email || '')
      .filter(Boolean)
    : [];
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
  const gerenciaSummary = gerenciaGestionadaPorCentro
    ? [
      `${Number(doc.gerencia_aprobadores_aprobados || 0)}/${totalAprobadoresGerencia} aprobadores`,
      ...(doc.gerencia_ya_aprobo_usuario_actual ? ['Tu aprobacion ya fue registrada.'] : []),
      ...(gerenciaPendientes.length > 0
        ? [`Pendientes: ${gerenciaPendientes.slice(0, 2).join(', ')}${gerenciaPendientes.length > 2 ? '...' : ''}`]
        : [])
    ]
    : [];
  const supportingPdfResources = useMemo(() => buildSupportingPdfResources(doc), [doc]);
  const centroCostoLabels = useMemo(() => buildCentroCostoLabels(doc), [doc]);
  const documentoVisible = getDocumentoConsecutivo(doc);
  const documentoCompleto = getDocumentoConsecutivoCompleto(doc);

  return (
    <SectionCard className="tramite-unificada-card">
      <div className="tramite-unificada-summary">
        <div className="tramite-unificada-summary-main">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="fw-semibold" title={documentoCompleto}>Factura #{documentoVisible}</div>
            <span className="badge text-bg-light border">Documento {sequenceNumber}</span>
          </div>
          <div className="text-muted small">
            {doc.emisor?.Nombre || doc.emisor?.nombre || '-'}
          </div>
          <div className="text-muted small">
            {getMoneda(doc)} - {formatAmount(getMontoDocumento(doc, { preferAjustado: true }))}
          </div>
        </div>
        <div className="tramite-unificada-summary-actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={onToggleExpanded}
          >
            {expanded ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
          <TramiteActions
            facturaId={doc.factura_id}
            puedeGerencia={puedeGerenciaDocumento}
            puedeGerenciaContable={puedeGerenciaContableDocumento}
            puedeFinanciera={puedeFinancieraDocumento}
            puedeTesoreria={puedeTesoreria}
            sociedadId={sociedadId}
            destinosTesoreria={destinosTesoreria}
            destinoSeleccionado={destinoSeleccionado}
            onDestinoChange={onDestinoChange}
            onDecision={onDecision}
            onAccionTesoreria={onAccionTesoreria}
            isExcluido={doc.estado_tesoreria === 'excluido'}
            isDevueltoContabilidad={doc.estado_tesoreria === 'devuelto_contabilidad'}
            showReincluir={false}
            className="d-flex flex-wrap gap-2"
            labels={TRAMITES_ACTION_LABELS}
          />
        </div>
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
        {puedeVerGerencia && gerenciaSummary.map((summaryLine) => (
          <span key={`${doc.factura_id}-${summaryLine}`} className="small text-muted">
            {summaryLine}
          </span>
        ))}
        <StatusBadge
          label={`G. Contable: ${decisionLabel(doc.estado_gerencia_contable)}`}
          className={decisionClass(doc.estado_gerencia_contable)}
        />
        <StatusBadge
          label={`Financiera: ${decisionLabel(doc.estado_financiero)}`}
          className={decisionClass(doc.estado_financiero)}
        />
        <StatusBadge
          label={`Gestion tesoreria: ${tesoreriaLabel(doc.estado_tesoreria)}`}
          className={tesoreriaClass(doc.estado_tesoreria)}
        />
      </div>
      {expanded && (
        <div className="row g-3 mt-1">
          <div className="col-12 col-lg-4">
            <div className="small text-muted">Centro de costo</div>
            {centroCostoLabels.length > 1 ? (
              <div className="mt-1">
                {centroCostoLabels.map((label) => (
                  <div key={`${doc.factura_id}-${label}`}>{label}</div>
                ))}
              </div>
            ) : (
              <div>{centroCostoLabels[0] || '-'}</div>
            )}
            <div className="small text-muted mt-2">Asiento</div>
            <div>{doc.conta_cuenta_contable || '-'}</div>
            <div className="small text-muted mt-2">Orden de compra</div>
            <div>{doc.conta_orden_compra || doc.conta_orden_compra_nombre || '-'}</div>
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
            <div className="border rounded p-3 bg-white">
              <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
                <div className="fw-semibold">PDF de la factura</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => openProtectedInNewTab(pdfUrl)}
                  disabled={!pdfUrl}
                >
                  Abrir en pestana nueva
                </button>
              </div>
              <ProtectedPdfFrame
                resourceUrl={pdfUrl}
                title={`PDF ${doc.factura_id}`}
                unavailableMessage="PDF no disponible."
                height="560px"
              />
            </div>

            {supportingPdfResources.map((resource) => (
              <TramiteDocumentoPdfResource
                key={resource.key}
                resource={resource}
                expandedByDefault={expandAllResources}
              />
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default TramiteDocumentoUnificado;
