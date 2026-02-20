import { Link, useParams } from 'react-router-dom';
import { useFacturaDetalle } from '../hooks/useFacturaDetalle';
import LoadingState from './common/LoadingState';
import PageHeader from './common/PageHeader';
import { FACTURA_DETALLE_LABELS, LOADING_LABELS } from '../utils/uiLabels';
import { withAuthToken } from '../utils/auth';
import FacturaDetalleSummaryCard from './facturaDetalle/FacturaDetalleSummaryCard';
import FacturaDetallePdfSection from './facturaDetalle/FacturaDetallePdfSection';
import FacturaDetalleContabilizacionSection from './facturaDetalle/FacturaDetalleContabilizacionSection';
import FacturaDetalleEstadoSection from './facturaDetalle/FacturaDetalleEstadoSection';
import FacturaDetalleHistorialSection from './facturaDetalle/FacturaDetalleHistorialSection';
import FacturaDetalleComentariosSection from './facturaDetalle/FacturaDetalleComentariosSection';

const ESTADOS = [
  'no_contabilizado',
  'contabilizado',
  'en_revision',
  'en_tramite_pago',
  'pagado_parcialmente',
  'en_aprobacion',
  'rechazado',
  'pagado'
];

function FacturaDetalle({ sociedadId }) {
  const { id } = useParams();
  const {
    factura,
    comentarios,
    estados,
    loading,
    commentUser,
    setCommentUser,
    commentText,
    setCommentText,
    estadoNuevo,
    setEstadoNuevo,
    estadoUser,
    setEstadoUser,
    estadoMotivo,
    setEstadoMotivo,
    error,
    mhLoading,
    mhError,
    conta,
    proveedoresSociedad,
    tablasPagoProveedor,
    tablaPagoActual,
    tablasModalOpen,
    setTablasModalOpen,
    tablasLoading,
    tablasError,
    notasCreditoProveedor,
    notaCreditoActual,
    notasModalOpen,
    setNotasModalOpen,
    notasLoading,
    notasError,
    retencionPagos,
    contaSaving,
    contaMessage,
    contaError,
    retencionPagoMonto,
    setRetencionPagoMonto,
    retencionPagoFecha,
    setRetencionPagoFecha,
    retencionPagoNotas,
    setRetencionPagoNotas,
    retencionPagoSaving,
    retencionPagoError,
    retencionPagoMessage,
    addComment,
    changeEstado,
    handleContaChange,
    abrirAsociarTablaPago,
    asociarTablaPago,
    abrirAsociarNotaCredito,
    asociarNotaCredito,
    verTablaPagoAsociada,
    verNotaCreditoAsociada,
    guardarContabilizacion,
    registrarPagoRetencion,
    verMensajeHacienda,
    verManifest
  } = useFacturaDetalle({ id, sociedadId });

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver el documento.</p>;
  }

  if (loading) return <LoadingState label={LOADING_LABELS.facturaDetalle} />;

  if (error) return <p>{error}</p>;

  if (!factura) return <p>Documento no encontrado.</p>;

  if (factura.sociedad_id && String(factura.sociedad_id) !== String(sociedadId)) {
    return <p>El documento no pertenece a la sociedad seleccionada.</p>;
  }

  const xmlUrl = factura.ruta_xml
    ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(factura.ruta_xml)}`)
    : '';
  const pdfUrl = factura.ruta_pdf
    ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(factura.ruta_pdf)}`)
    : '';
  const tablaPagoPdfUrl = tablaPagoActual?.ruta_pdf
    ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(tablaPagoActual.ruta_pdf)}`)
    : '';
  const notaCreditoPdfUrl = notaCreditoActual?.ruta_pdf
    ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(notaCreditoActual.ruta_pdf)}`)
    : '';
  const notaCreditoXmlUrl = notaCreditoActual?.ruta_xml
    ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(notaCreditoActual.ruta_xml)}`)
    : '';

  const monedaFactura = factura.resumen?.CodigoTipoMoneda?.CodigoMoneda
    || factura.resumen?.CodigoMoneda
    || factura.resumen?.codigoMoneda
    || 'CRC';

  const mhDisponible = factura.has_mensaje_hacienda !== false;
  const mostrarManifest = true;
  const manifestDisponible = Boolean(factura.ruta_xml || factura.ruta_pdf);

  const toNonNegativeNumber = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  };

  const totalFactura = toNonNegativeNumber(factura.resumen?.TotalComprobante);
  const rebajosAplicados = toNonNegativeNumber(conta.descuento)
    + toNonNegativeNumber(conta.anticipo_aplicado)
    + toNonNegativeNumber(conta.monto_nota_credito);
  const retencionTotal = toNonNegativeNumber(conta.retencion);
  const totalPagoPrincipal = Math.max(totalFactura - rebajosAplicados - retencionTotal, 0);
  const retencionPagada = toNonNegativeNumber(conta.retencion_pagada);
  const retencionPendiente = Math.max(retencionTotal - retencionPagada, 0);
  const totalPendienteGlobal = totalPagoPrincipal + retencionPendiente;

  return (
    <div className="container-fluid">
      <PageHeader
        title={`${FACTURA_DETALLE_LABELS.header.title} #${factura.id}`}
        subtitle={FACTURA_DETALLE_LABELS.header.subtitle}
        actions={(
          <Link className="btn btn-light" to="/facturas">
            {FACTURA_DETALLE_LABELS.header.back}
          </Link>
        )}
      />

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <FacturaDetalleSummaryCard factura={factura} monedaFactura={monedaFactura} />

          <FacturaDetallePdfSection
            id={id}
            pdfUrl={pdfUrl}
            xmlUrl={xmlUrl}
            mhLoading={mhLoading}
            mhError={mhError}
            mhDisponible={mhDisponible}
            mostrarManifest={mostrarManifest}
            manifestDisponible={manifestDisponible}
            verMensajeHacienda={verMensajeHacienda}
            verManifest={verManifest}
            tablaPagoActual={tablaPagoActual}
            tablaPagoPdfUrl={tablaPagoPdfUrl}
            verTablaPagoAsociada={verTablaPagoAsociada}
            notaCreditoActual={notaCreditoActual}
            notaCreditoPdfUrl={notaCreditoPdfUrl}
            notaCreditoXmlUrl={notaCreditoXmlUrl}
            verNotaCreditoAsociada={verNotaCreditoAsociada}
          />
        </div>

        <div className="col-12 col-lg-5">
          <FacturaDetalleContabilizacionSection
            conta={conta}
            proveedoresSociedad={proveedoresSociedad}
            tablasPagoProveedor={tablasPagoProveedor}
            tablaPagoActual={tablaPagoActual}
            tablasModalOpen={tablasModalOpen}
            setTablasModalOpen={setTablasModalOpen}
            tablasLoading={tablasLoading}
            tablasError={tablasError}
            notasCreditoProveedor={notasCreditoProveedor}
            notaCreditoActual={notaCreditoActual}
            notasModalOpen={notasModalOpen}
            setNotasModalOpen={setNotasModalOpen}
            notasLoading={notasLoading}
            notasError={notasError}
            retencionPagos={retencionPagos}
            contaSaving={contaSaving}
            contaMessage={contaMessage}
            contaError={contaError}
            retencionPagoMonto={retencionPagoMonto}
            setRetencionPagoMonto={setRetencionPagoMonto}
            retencionPagoFecha={retencionPagoFecha}
            setRetencionPagoFecha={setRetencionPagoFecha}
            retencionPagoNotas={retencionPagoNotas}
            setRetencionPagoNotas={setRetencionPagoNotas}
            retencionPagoSaving={retencionPagoSaving}
            retencionPagoError={retencionPagoError}
            retencionPagoMessage={retencionPagoMessage}
            handleContaChange={handleContaChange}
            abrirAsociarTablaPago={abrirAsociarTablaPago}
            asociarTablaPago={asociarTablaPago}
            abrirAsociarNotaCredito={abrirAsociarNotaCredito}
            asociarNotaCredito={asociarNotaCredito}
            verTablaPagoAsociada={verTablaPagoAsociada}
            verNotaCreditoAsociada={verNotaCreditoAsociada}
            guardarContabilizacion={guardarContabilizacion}
            registrarPagoRetencion={registrarPagoRetencion}
            totalFactura={totalFactura}
            rebajosAplicados={rebajosAplicados}
            retencionTotal={retencionTotal}
            totalPagoPrincipal={totalPagoPrincipal}
            retencionPagada={retencionPagada}
            retencionPendiente={retencionPendiente}
            totalPendienteGlobal={totalPendienteGlobal}
          />

          <FacturaDetalleEstadoSection
            estadosDisponibles={ESTADOS}
            estadoUser={estadoUser}
            setEstadoUser={setEstadoUser}
            estadoNuevo={estadoNuevo}
            setEstadoNuevo={setEstadoNuevo}
            estadoMotivo={estadoMotivo}
            setEstadoMotivo={setEstadoMotivo}
            changeEstado={changeEstado}
          />

          <FacturaDetalleHistorialSection estados={estados} />

          <FacturaDetalleComentariosSection
            commentUser={commentUser}
            setCommentUser={setCommentUser}
            commentText={commentText}
            setCommentText={setCommentText}
            addComment={addComment}
            comentarios={comentarios}
          />
        </div>
      </div>
    </div>
  );
}

export default FacturaDetalle;
