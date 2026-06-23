import SectionCard from '../common/SectionCard';
import {
  formatAmount,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
} from '../../utils/formatters';

function TramitePagosSection({
  visible,
  documentosActivos,
  pagosFacturas,
  onPagoFacturaChange
}) {
  if (!visible) {
    return null;
  }

  return (
    <SectionCard className="table-card mt-3" title="Montos de pago por factura">
      <div className="text-muted mb-2">
        Ajusta el monto a pagar por factura. Si deseas pago completo, deja el monto sugerido.
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Emisor</th>
              <th>Moneda</th>
              <th>Saldo pendiente</th>
              <th>Monto a pagar ahora</th>
            </tr>
          </thead>
          <tbody>
            {documentosActivos.map((doc) => {
              const facturaId = Number(doc.factura_id);
              const pendiente = Number(doc.total_a_pagar || 0);
              const disabled = !Number.isFinite(pendiente) || pendiente <= 0;
              const documentoVisible = getDocumentoConsecutivo(doc, String(facturaId));
              const documentoCompleto = getDocumentoConsecutivoCompleto(doc, String(facturaId));

              return (
                <tr key={`pago-${facturaId}`}>
                  <td className="fw-semibold" title={documentoCompleto}>#{documentoVisible}</td>
                  <td>{doc.emisor?.Nombre || doc.emisor?.nombre || '-'}</td>
                  <td>{doc.resumen?.CodigoTipoMoneda?.CodigoMoneda || doc.resumen?.CodigoMoneda || 'CRC'}</td>
                  <td>{formatAmount(pendiente)}</td>
                  <td style={{ minWidth: '180px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={pagosFacturas[facturaId] ?? (Number.isFinite(pendiente) ? pendiente.toFixed(2) : '0.00')}
                      onChange={(event) => onPagoFacturaChange(facturaId, event.target.value)}
                      disabled={disabled}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default TramitePagosSection;
