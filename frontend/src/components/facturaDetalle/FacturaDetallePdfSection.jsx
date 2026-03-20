import { useReducer } from 'react';
import ActionAlerts from '../common/ActionAlerts';
import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';
import { useProtectedObjectUrl } from '../../hooks/useProtectedObjectUrl.js';
import { openProtectedInNewTab } from '../../utils/protectedResources.js';

const buildResetKey = ({ id, tablaPagoActual, ordenCompraActual, notaCreditoActual }) => (
  [
    id || '',
    tablaPagoActual?.id || '',
    ordenCompraActual?.id || '',
    notaCreditoActual?.id || ''
  ].join('|')
);

const initialPdfPanelState = {
  tablaPagoOptionsOpen: false,
  tablaPagoInlineOpen: false,
  ordenCompraOptionsOpen: false,
  ordenCompraInlineOpen: false,
  notaCreditoOptionsOpen: false,
  notaCreditoInlineOpen: false
};

const pdfPanelKeysBySection = {
  tablaPago: { options: 'tablaPagoOptionsOpen', inline: 'tablaPagoInlineOpen' },
  ordenCompra: { options: 'ordenCompraOptionsOpen', inline: 'ordenCompraInlineOpen' },
  notaCredito: { options: 'notaCreditoOptionsOpen', inline: 'notaCreditoInlineOpen' }
};

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
      src={objectUrl}
      style={{ width: '100%', height, border: '1px solid #e6ebf2' }}
    />
  );
}

const pdfPanelReducer = (state, action) => {
  const sectionKeys = pdfPanelKeysBySection[action.section];
  if (!sectionKeys) return state;

  if (action.type === 'toggleOptions') {
    const nextOptions = !state[sectionKeys.options];
    return {
      ...state,
      [sectionKeys.options]: nextOptions,
      [sectionKeys.inline]: nextOptions ? state[sectionKeys.inline] : false
    };
  }

  if (action.type === 'toggleInline') {
    return {
      ...state,
      [sectionKeys.options]: true,
      [sectionKeys.inline]: !state[sectionKeys.inline]
    };
  }

  return state;
};

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
  verNotaCreditoAsociada
}) {
  const [pdfPanelState, dispatchPdfPanel] = useReducer(pdfPanelReducer, initialPdfPanelState);
  const {
    tablaPagoOptionsOpen,
    tablaPagoInlineOpen,
    ordenCompraOptionsOpen,
    ordenCompraInlineOpen,
    notaCreditoOptionsOpen,
    notaCreditoInlineOpen
  } = pdfPanelState;

  const toggleTablaPagoOptions = () => {
    dispatchPdfPanel({ type: 'toggleOptions', section: 'tablaPago' });
  };

  const toggleTablaPagoInline = () => {
    dispatchPdfPanel({ type: 'toggleInline', section: 'tablaPago' });
  };

  const toggleOrdenCompraOptions = () => {
    dispatchPdfPanel({ type: 'toggleOptions', section: 'ordenCompra' });
  };

  const toggleOrdenCompraInline = () => {
    dispatchPdfPanel({ type: 'toggleInline', section: 'ordenCompra' });
  };

  const toggleNotaCreditoOptions = () => {
    dispatchPdfPanel({ type: 'toggleOptions', section: 'notaCredito' });
  };

  const toggleNotaCreditoInline = () => {
    dispatchPdfPanel({ type: 'toggleInline', section: 'notaCredito' });
  };

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
        height="600px"
        unavailableMessage={FACTURA_DETALLE_LABELS.pdf.pdfUnavailable}
      />

      {tablaPagoActual?.ruta_pdf && (
        <div className="mt-3">
          <button
            className="btn btn-outline-success w-100"
            type="button"
            onClick={toggleTablaPagoOptions}
          >
            Ver tabla de pagos
          </button>
          {tablaPagoOptionsOpen && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              <button
                className="btn btn-outline-success btn-sm"
                type="button"
                onClick={verTablaPagoAsociada}
              >
                Abrir en pestana nueva
              </button>
              <button
                className={`btn btn-sm ${tablaPagoInlineOpen ? 'btn-success' : 'btn-outline-success'}`}
                type="button"
                onClick={toggleTablaPagoInline}
              >
                {tablaPagoInlineOpen ? 'Ocultar' : 'Expandir'}
              </button>
            </div>
          )}
          {tablaPagoInlineOpen && tablaPagoPdfUrl && (
            <div className="mt-2">
              <div className="text-muted small mb-1">
                Tabla asociada: {tablaPagoActual.nombre}
              </div>
              <ProtectedPdfEmbed
                resourceUrl={tablaPagoPdfUrl}
                title="Tabla de pagos PDF"
                unavailableMessage="Tabla de pagos no disponible."
              />
            </div>
          )}
        </div>
      )}

      {ordenCompraActual?.ruta_pdf && (
        <div className="mt-3">
          <button
            className="btn btn-outline-success w-100"
            type="button"
            onClick={toggleOrdenCompraOptions}
          >
            Ver orden de compra
          </button>
          {ordenCompraOptionsOpen && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              <button
                className="btn btn-outline-success btn-sm"
                type="button"
                onClick={verOrdenCompraAsociada}
              >
                Abrir en pestana nueva
              </button>
              <button
                className={`btn btn-sm ${ordenCompraInlineOpen ? 'btn-success' : 'btn-outline-success'}`}
                type="button"
                onClick={toggleOrdenCompraInline}
              >
                {ordenCompraInlineOpen ? 'Ocultar' : 'Expandir'}
              </button>
            </div>
          )}
          {ordenCompraInlineOpen && ordenCompraPdfUrl && (
            <div className="mt-2">
              <div className="text-muted small mb-1">
                OC asociada: {ordenCompraActual.nombre}
              </div>
              <ProtectedPdfEmbed
                resourceUrl={ordenCompraPdfUrl}
                title="Orden de compra PDF"
                unavailableMessage="Orden de compra no disponible."
              />
            </div>
          )}
        </div>
      )}

      {(notaCreditoActual?.ruta_pdf || notaCreditoActual?.ruta_xml) && (
        <div className="mt-3">
          <button
            className="btn btn-outline-success w-100"
            type="button"
            onClick={toggleNotaCreditoOptions}
          >
            Ver nota de credito
          </button>
          {notaCreditoOptionsOpen && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              <button
                className="btn btn-outline-success btn-sm"
                type="button"
                onClick={verNotaCreditoAsociada}
              >
                Abrir en pestana nueva
              </button>
              <button
                className={`btn btn-sm ${notaCreditoInlineOpen ? 'btn-success' : 'btn-outline-success'}`}
                type="button"
                onClick={toggleNotaCreditoInline}
                disabled={!notaCreditoPdfUrl}
              >
                {notaCreditoInlineOpen ? 'Ocultar' : 'Expandir'}
              </button>
            </div>
          )}
          {notaCreditoInlineOpen && notaCreditoPdfUrl && (
            <div className="mt-2">
              <div className="text-muted small mb-1">
                Nota asociada: {notaCreditoActual.clave || `Nota #${notaCreditoActual.id}`}
              </div>
              <ProtectedPdfEmbed
                resourceUrl={notaCreditoPdfUrl}
                title="Nota de credito PDF"
                unavailableMessage="Nota de credito no disponible."
              />
            </div>
          )}
          {notaCreditoOptionsOpen && !notaCreditoPdfUrl && notaCreditoXmlUrl && (
            <div className="text-muted small mt-2">
              Esta nota no tiene PDF. Solo se puede abrir XML en pestana nueva.
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function FacturaDetallePdfSection({ viewModel }) {
  const {
    id,
    tablaPagoActual,
    ordenCompraActual,
    notaCreditoActual,
    ...rest
  } = viewModel;

  const resetKey = buildResetKey({ id, tablaPagoActual, ordenCompraActual, notaCreditoActual });

  return (
    <FacturaDetallePdfSectionContent
      key={resetKey}
      tablaPagoActual={tablaPagoActual}
      ordenCompraActual={ordenCompraActual}
      notaCreditoActual={notaCreditoActual}
      {...rest}
    />
  );
}

export default FacturaDetallePdfSection;
