import EmptyState from '../common/EmptyState.jsx';
import SectionCard from '../common/SectionCard.jsx';
import { formatCurrencyAmount } from './dashboardViewModel.js';

function DashboardProvidersSection({ groups }) {
  return (
    <SectionCard title="Top proveedores por pagar" className="section-card">
      {groups.length === 0 && (
        <EmptyState className="py-2">Sin proveedores pendientes.</EmptyState>
      )}
      {groups.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {groups.map(([moneda, proveedores]) => (
            <div className="dashboard-provider-group" key={moneda}>
              <div className="dashboard-subsection-title">{moneda}</div>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Docs</th>
                      <th>Pago principal</th>
                      <th>Retencion pendiente</th>
                      <th>Pendiente global</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedores.map((proveedor) => (
                      <tr key={`${moneda}-${proveedor.proveedorId}`}>
                        <td>
                          <div className="fw-semibold">{proveedor.proveedorNombre}</div>
                          <div className="text-muted small">
                            {proveedor.proveedorIdentificacion || 'Sin identificacion'}
                          </div>
                        </td>
                        <td>{proveedor.documentos}</td>
                        <td>{formatCurrencyAmount(moneda, proveedor.totalAPagar)}</td>
                        <td>{formatCurrencyAmount(moneda, proveedor.totalRetencionPendiente)}</td>
                        <td>{formatCurrencyAmount(moneda, proveedor.totalPendienteGlobal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default DashboardProvidersSection;
