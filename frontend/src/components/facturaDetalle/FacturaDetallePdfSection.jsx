import { useEffect, useState } from 'react';
import ActionAlerts from '../common/ActionAlerts';
import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';

function FacturaDetallePdfSection({
  id,
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
  notaCreditoActual,
  notaCreditoPdfUrl,
  notaCreditoXmlUrl,
  verNotaCreditoAsociada
}) {
  const [tablaPagoOptionsOpen, setTablaPagoOptionsOpen] = useState(false);
  const [tablaPagoInlineOpen, setTablaPagoInlineOpen] = useState(false);
  const [notaCreditoOptionsOpen, setNotaCreditoOptionsOpen] = useState(false);
  const [notaCreditoInlineOpen, setNotaCreditoInlineOpen] = useState(false);

  useEffect(() => {
    setTablaPagoOptionsOpen(false);
    setTablaPagoInlineOpen(false);
    setNotaCreditoOptionsOpen(false);
    setNotaCreditoInlineOpen(false);
  }, [id, tablaPagoActual?.id, notaCreditoActual?.id]);

  const toggleTablaPagoOptions = () => {
    setTablaPagoOptionsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setTablaPagoInlineOpen(false);
      }
      return next;
    });
  };

  const toggleTablaPagoInline = () => {
    setTablaPagoOptionsOpen(true);
    setTablaPagoInlineOpen((prev) => !prev);
  };

  const toggleNotaCreditoOptions = () => {
    setNotaCreditoOptionsOpen((prev) => {
      const next = !prev;
      if (!next) {
        setNotaCreditoInlineOpen(false);
      }
      return next;
    });
  };

  const toggleNotaCreditoInline = () => {
    setNotaCreditoOptionsOpen(true);
    setNotaCreditoInlineOpen((prev) => !prev);
  };

  return (
    <SectionCard
      title={FACTURA_DETALLE_LABELS.pdf.title}
      className="mt-3"
      actions={(
        <div className="d-flex flex-wrap gap-2">
          {pdfUrl ? (
            <a className="btn btn-outline-secondary btn-sm" href={pdfUrl} target="_blank" rel="noreferrer">
              {FACTURA_DETALLE_LABELS.pdf.pdfOpenTab}
            </a>
          ) : (
            <button className="btn btn-outline-secondary btn-sm" type="button" disabled>
              {FACTURA_DETALLE_LABELS.pdf.pdfOpenTabUnavailable}
            </button>
          )}
          {xmlUrl ? (
            <a className="btn btn-outline-secondary btn-sm" href={xmlUrl} target="_blank" rel="noreferrer">
              {FACTURA_DETALLE_LABELS.pdf.xmlAvailable}
            </a>
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
      {pdfUrl ? (
        <iframe
          title="PDF"
          src={pdfUrl}
          style={{ width: '100%', height: '600px', border: '1px solid #e6ebf2' }}
        />
      ) : (
        <EmptyState className="py-2">{FACTURA_DETALLE_LABELS.pdf.pdfUnavailable}</EmptyState>
      )}

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
              <iframe
                title="Tabla de pagos PDF"
                src={tablaPagoPdfUrl}
                style={{ width: '100%', height: '520px', border: '1px solid #e6ebf2' }}
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
              <iframe
                title="Nota de credito PDF"
                src={notaCreditoPdfUrl}
                style={{ width: '100%', height: '520px', border: '1px solid #e6ebf2' }}
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

export default FacturaDetallePdfSection;
