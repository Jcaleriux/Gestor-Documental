import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import {
  formatAmount,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
} from '../../utils/formatters';

function TramiteRetencionesSection({ retencionesActivas }) {
  return (
    <SectionCard className="table-card mt-3" title="Retenciones incluidas en el tramite">
      {retencionesActivas.length === 0 ? (
        <EmptyState className="py-2">No hay retenciones asociadas a este tramite.</EmptyState>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Factura</th>
                <th>Moneda</th>
                <th>Monto retencion</th>
                <th>Estado tesoreria</th>
              </tr>
            </thead>
            <tbody>
              {retencionesActivas.map((ret) => {
                const documentoVisible = getDocumentoConsecutivo(ret);
                const documentoCompleto = getDocumentoConsecutivoCompleto(ret);

                return (
                  <tr key={ret.id}>
                    <td>
                      <div>{ret.proveedor_nombre || '-'}</div>
                      <div className="text-muted small">{ret.proveedor_identificacion || '-'}</div>
                    </td>
                    <td title={documentoCompleto}>#{documentoVisible}</td>
                    <td>{ret.moneda || 'CRC'}</td>
                    <td>{formatAmount(ret.monto_retencion)}</td>
                    <td>{ret.estado_tesoreria || 'pendiente'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export default TramiteRetencionesSection;
