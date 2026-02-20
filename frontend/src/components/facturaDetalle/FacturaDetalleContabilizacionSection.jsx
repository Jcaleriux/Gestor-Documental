import ActionAlerts from '../common/ActionAlerts';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';
import SelectionListModal from './contabilizacion/SelectionListModal';
import ContaMainFields from './contabilizacion/ContaMainFields';
import ContaAssociationsActions from './contabilizacion/ContaAssociationsActions';
import ContaTotalsSummary from './contabilizacion/ContaTotalsSummary';
import RetencionPagoPanel from './contabilizacion/RetencionPagoPanel';

function FacturaDetalleContabilizacionSection({
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
  handleContaChange,
  abrirAsociarTablaPago,
  asociarTablaPago,
  abrirAsociarNotaCredito,
  asociarNotaCredito,
  verTablaPagoAsociada,
  verNotaCreditoAsociada,
  guardarContabilizacion,
  registrarPagoRetencion,
  totalFactura,
  rebajosAplicados,
  retencionTotal,
  totalPagoPrincipal,
  retencionPagada,
  retencionPendiente,
  totalPendienteGlobal
}) {
  return (
    <SectionCard title={FACTURA_DETALLE_LABELS.contabilizacion.title} className="mb-3">
      <form onSubmit={guardarContabilizacion} className="row g-2">
        <ContaMainFields
          conta={conta}
          handleContaChange={handleContaChange}
          proveedoresSociedad={proveedoresSociedad}
        />

        <ContaAssociationsActions
          conta={conta}
          tablasLoading={tablasLoading}
          notasLoading={notasLoading}
          tablaPagoActual={tablaPagoActual}
          notaCreditoActual={notaCreditoActual}
          abrirAsociarTablaPago={abrirAsociarTablaPago}
          abrirAsociarNotaCredito={abrirAsociarNotaCredito}
          verTablaPagoAsociada={verTablaPagoAsociada}
          verNotaCreditoAsociada={verNotaCreditoAsociada}
        />

        <ContaTotalsSummary
          conta={conta}
          totalFactura={totalFactura}
          rebajosAplicados={rebajosAplicados}
          retencionTotal={retencionTotal}
          totalPagoPrincipal={totalPagoPrincipal}
          retencionPagada={retencionPagada}
          retencionPendiente={retencionPendiente}
          totalPendienteGlobal={totalPendienteGlobal}
        />

        <RetencionPagoPanel
          retencionTotal={retencionTotal}
          retencionPendiente={retencionPendiente}
          retencionPagoMonto={retencionPagoMonto}
          setRetencionPagoMonto={setRetencionPagoMonto}
          retencionPagoFecha={retencionPagoFecha}
          setRetencionPagoFecha={setRetencionPagoFecha}
          retencionPagoNotas={retencionPagoNotas}
          setRetencionPagoNotas={setRetencionPagoNotas}
          retencionPagoSaving={retencionPagoSaving}
          retencionPagoError={retencionPagoError}
          retencionPagoMessage={retencionPagoMessage}
          registrarPagoRetencion={registrarPagoRetencion}
          retencionPagos={retencionPagos}
        />

        {tablasModalOpen && (
          <SelectionListModal
            title="Seleccionar tabla de pagos"
            error={tablasError}
            items={tablasPagoProveedor}
            emptyMessage="No hay tablas de pago para este proveedor."
            onClose={() => setTablasModalOpen(false)}
            onSelect={asociarTablaPago}
            renderLabel={(tabla) => tabla.nombre}
          />
        )}

        {notasModalOpen && (
          <SelectionListModal
            title="Seleccionar nota de credito"
            error={notasError}
            items={notasCreditoProveedor}
            emptyMessage="No hay notas de credito para este proveedor."
            onClose={() => setNotasModalOpen(false)}
            onSelect={asociarNotaCredito}
            renderLabel={(nota) => nota.clave || `Nota #${nota.id}`}
          />
        )}

        <div className="col-12">
          <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.notas}</label>
          <textarea
            className="form-control"
            rows="2"
            value={conta.notas}
            onChange={handleContaChange('notas')}
          />
        </div>

        <ActionAlerts error={contaError} message={contaMessage} className="small" />

        <div className="col-12">
          <button className="btn btn-success w-100" type="submit" disabled={contaSaving}>
            {contaSaving ? FACTURA_DETALLE_LABELS.contabilizacion.saving : FACTURA_DETALLE_LABELS.contabilizacion.submit}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

export default FacturaDetalleContabilizacionSection;
