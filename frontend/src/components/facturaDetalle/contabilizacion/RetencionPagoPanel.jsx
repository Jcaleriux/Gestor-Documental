import ActionAlerts from '../../common/ActionAlerts';
import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels';
import { formatAmount } from '../../../utils/formatters';

function RetencionPagoPanel({ viewModel }) {
  const {
    retencionTotal,
    retencionPendiente,
    retencionPagoMonto,
    setRetencionPagoMonto,
    retencionPagoFecha,
    setRetencionPagoFecha,
    retencionPagoNotas,
    setRetencionPagoNotas,
    retencionPagoSaving,
    retencionPagoError,
    retencionPagoMessage,
    registrarPagoRetencion,
    retencionPagos
  } = viewModel;

  if (retencionTotal <= 0) {
    return null;
  }

  return (
    <div className="col-12">
      <div className="border rounded p-2">
        <div className="fw-semibold mb-2">{FACTURA_DETALLE_LABELS.contabilizacion.registrarPagoRetencion}</div>
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.montoPagoRetencion}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={retencionPagoMonto}
              onChange={(event) => setRetencionPagoMonto(event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.fechaPagoRetencion}</label>
            <input
              type="date"
              className="form-control"
              value={retencionPagoFecha}
              onChange={(event) => setRetencionPagoFecha(event.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.notasPagoRetencion}</label>
            <input
              className="form-control"
              value={retencionPagoNotas}
              onChange={(event) => setRetencionPagoNotas(event.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="col-12">
            <button
              className="btn btn-outline-primary btn-sm"
              type="button"
              onClick={registrarPagoRetencion}
              disabled={retencionPagoSaving || retencionPendiente <= 0}
            >
              {retencionPagoSaving
                ? FACTURA_DETALLE_LABELS.contabilizacion.registrandoPagoRetencion
                : FACTURA_DETALLE_LABELS.contabilizacion.registrarPagoRetencion}
            </button>
          </div>
        </div>
        <ActionAlerts error={retencionPagoError} message={retencionPagoMessage} className="small mt-2" />
        {retencionPagos.length > 0 && (
          <div className="mt-2">
            <div className="small text-muted mb-1">{FACTURA_DETALLE_LABELS.contabilizacion.historialRetencion}</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Usuario</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {retencionPagos.map((pago) => (
                    <tr key={pago.id}>
                      <td>{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : '-'}</td>
                      <td>{formatAmount(pago.monto)}</td>
                      <td>{pago.usuario || '-'}</td>
                      <td>{pago.notas || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RetencionPagoPanel;
