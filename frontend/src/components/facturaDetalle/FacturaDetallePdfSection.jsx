import { useState } from 'react';
import ActionAlerts from '../common/ActionAlerts';
import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';
import { useProtectedObjectUrl } from '../../hooks/useProtectedObjectUrl.js';
import { openProtectedInNewTab } from '../../utils/protectedResources.js';
import { withPdfFitToWidth } from '../../utils/pdfViewer.js';

const buildResetKey = ({
  id,
  tablaPagoActual,
  ordenCompraActual,
  notaCreditoActual,
  documentosRespaldoActuales
}) => (
  [
    id || '',
    tablaPagoActual?.id || '',
    ordenCompraActual?.id || '',
    notaCreditoActual?.id || '',
    Array.isArray(documentosRespaldoActuales)
      ? documentosRespaldoActuales.map((documento) => documento.id).join(',')
      : ''
  ].join('|')
);

function ProtectedPdfEmbed({ resourceUrl, title, unavailableMessage, height = '520px' }) {
  const {
    objectUrl,
    error,
    loading,
  } = useProtectedObjectUrl(resourceUrl);

  if (!resourceUrl) {
    return <EmptyState className="py-2">{unavailableMessage}</EmptyState>;
  }

  if (loading) {
    return <div className="small text-muted">Cargando PDF...</div>;
  }

  if (!objectUrl) {
    return <div className="small text-danger">{error || unavailableMessage}</div>;
  }

  return (
    <iframe
      title={title}
      src={withPdfFitToWidth(objectUrl)}
      style={{ width: '100%', height, border: '1px solid #e6ebf2' }}
    />
  );
}

function AssociatedPdfPanel({
  buttonLabel,
  headerText,
  inlineCaption,
  resourceUrl,
  title,
  unavailableMessage,
  onOpenExternal,
  canExpand = true,
  expandUnavailableMessage = ''
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);

  const handleToggleOptions = () => {
    setOptionsOpen((previous) => {
      const nextValue = !previous;
      if (!nextValue) {
        setInlineOpen(false);
      }
      return nextValue;
    });
  };

  const handleToggleInline = () => {
    setOptionsOpen(true);
    setInlineOpen((previous) => !previous);
  };

  return (
    <div className="mt-3">
      {headerText ? (
        <div className="text-muted small mb-1">{headerText}</div>
      ) : null}

      <button
        className="btn btn-outline-success w-100"
        type="button"
        onClick={handleToggleOptions}
      >
        {buttonLabel}
      </button>

      {optionsOpen && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          <button
            className="btn btn-outline-success btn-sm"
            type="button"
            onClick={onOpenExternal}
          >
            Abrir en pestaña nueva
          </button>
          <button
            className={`btn btn-sm ${inlineOpen ? 'btn-success' : 'btn-outline-success'}`}
            type="button"
            onClick={handleToggleInline}
            disabled={!canExpand}
          >
            {inlineOpen ? 'Ocultar' : 'Expandir'}
          </button>
        </div>
      )}

      {inlineOpen && canExpand && (
        <div className="mt-2">
          {inlineCaption ? (
            <div className="text-muted small mb-1">{inlineCaption}</div>
          ) : null}
          <ProtectedPdfEmbed
            resourceUrl={resourceUrl}
            title={title}
            unavailableMessage={unavailableMessage}
          />
        </div>
      )}

      {optionsOpen && !canExpand && expandUnavailableMessage ? (
        <div className="text-muted small mt-2">
          {expandUnavailableMessage}
        </div>
      ) : null}
    </div>
  );
}

function FacturaDetallePdfSectionContent({
  pdfUrl,
  xmlUrl,
  mhLoading,
  mhError,
  mhDisponible,
  mostrarManifest,
  manifestDisponible,
  verMensajeHacienda,
  verManifest,
  tablaPagoActual,
  tablaPagoPdfUrl,
  verTablaPagoAsociada,
  ordenCompraActual,
  ordenCompraPdfUrl,
  verOrdenCompraAsociada,
  notaCreditoActual,
  notaCreditoPdfUrl,
  notaCreditoXmlUrl,
  verNotaCreditoAsociada,
  documentosRespaldoActuales,
  verDocumentoRespaldo
}) {
  return (
    <SectionCard
      title={FACTURA_DETALLE_LABELS.pdf.title}
      className="mt-3"
      actions={(
        <div className="d-flex flex-wrap gap-2">
          {pdfUrl ? (
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => openProtectedInNewTab(pdfUrl)}
            >
              {FACTURA_DETALLE_LABELS.pdf.pdfOpenTab}
            </button>
          ) : (
            <button className="btn btn-outline-secondary btn-sm" type="button" disabled>
              {FACTURA_DETALLE_LABELS.pdf.pdfOpenTabUnavailable}
            </button>
          )}
          {xmlUrl ? (
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => openProtectedInNewTab(xmlUrl)}
            >
              {FACTURA_DETALLE_LABELS.pdf.xmlAvailable}
            </button>
          ) : (
            <button className="btn btn-outline-secondary btn-sm" type="button" disabled>
              {FACTURA_DETALLE_LABELS.pdf.xmlUnavailable}
            </button>
          )}
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={verMensajeHacienda}
            disabled={mhLoading || !mhDisponible}
          >
            {mhLoading
              ? FACTURA_DETALLE_LABELS.pdf.mhLoading
              : (mhDisponible
                ? FACTURA_DETALLE_LABELS.pdf.mhButton
                : FACTURA_DETALLE_LABELS.pdf.mhUnavailable)}
          </button>
          {mostrarManifest && (
            <button
              className="btn btn-outline-dark btn-sm"
              type="button"
              onClick={verManifest}
              disabled={!manifestDisponible}
            >
              {manifestDisponible
                ? FACTURA_DETALLE_LABELS.pdf.manifestButton
                : FACTURA_DETALLE_LABELS.pdf.manifestUnavailable}
            </button>
          )}
        </div>
      )}
    >
      <ActionAlerts error={mhError} message="" className="small mb-2" />
      <ProtectedPdfEmbed
        resourceUrl={pdfUrl}
        title="PDF"
        height="min(66vh, 680px)"
        unavailableMessage={FACTURA_DETALLE_LABELS.pdf.pdfUnavailable}
      />

      {tablaPagoActual?.ruta_pdf ? (
        <AssociatedPdfPanel
          buttonLabel="Ver tabla de pagos"
          inlineCaption={`Tabla asociada: ${tablaPagoActual.nombre}`}
          resourceUrl={tablaPagoPdfUrl}
          title="Tabla de pagos PDF"
          unavailableMessage="Tabla de pagos no disponible."
          onOpenExternal={verTablaPagoAsociada}
        />
      ) : null}

      {ordenCompraActual?.ruta_pdf ? (
        <AssociatedPdfPanel
          buttonLabel="Ver orden de compra"
          inlineCaption={`OC asociada: ${ordenCompraActual.nombre}`}
          resourceUrl={ordenCompraPdfUrl}
          title="Orden de compra PDF"
          unavailableMessage="Orden de compra no disponible."
          onOpenExternal={verOrdenCompraAsociada}
        />
      ) : null}

      {(notaCreditoActual?.ruta_pdf || notaCreditoActual?.ruta_xml) ? (
        <AssociatedPdfPanel
          buttonLabel="Ver nota de crédito"
          inlineCaption={`Nota asociada: ${notaCreditoActual.clave || `Nota #${notaCreditoActual.id}`}`}
          resourceUrl={notaCreditoPdfUrl}
          title="Nota de crédito PDF"
          unavailableMessage="Nota de crédito no disponible."
          onOpenExternal={verNotaCreditoAsociada}
          canExpand={Boolean(notaCreditoPdfUrl)}
          expandUnavailableMessage={
            notaCreditoXmlUrl
              ? 'Esta nota no tiene PDF. Solo se puede abrir XML en pestaña nueva.'
              : ''
          }
        />
      ) : null}

      {Array.isArray(documentosRespaldoActuales) && documentosRespaldoActuales.map((documento) => (
        <AssociatedPdfPanel
          key={documento.id}
          buttonLabel="Ver documento de respaldo"
          headerText={`Documento de respaldo: ${documento.nombre_archivo}`}
          inlineCaption={`Documento de respaldo: ${documento.nombre_archivo}`}
          resourceUrl={documento.pdfUrl}
          title={`Documento de respaldo ${documento.nombre_archivo}`}
          unavailableMessage="Documento de respaldo no disponible."
          onOpenExternal={() => verDocumentoRespaldo(documento)}
        />
      ))}
    </SectionCard>
  );
}

function FacturaDetallePdfSection({ viewModel }) {
  const {
    id,
    tablaPagoActual,
    ordenCompraActual,
    notaCreditoActual,
    documentosRespaldoActuales,
    ...rest
  } = viewModel;

  const resetKey = buildResetKey({
    id,
    tablaPagoActual,
    ordenCompraActual,
    notaCreditoActual,
    documentosRespaldoActuales
  });

  return (
    <FacturaDetallePdfSectionContent
      key={resetKey}
      tablaPagoActual={tablaPagoActual}
      ordenCompraActual={ordenCompraActual}
      notaCreditoActual={notaCreditoActual}
      documentosRespaldoActuales={documentosRespaldoActuales}
      {...rest}
    />
  );
}

export default FacturaDetallePdfSection;
