import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { formatAmount, formatRelativeTime } from '../utils/formatters';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import SectionCard from './common/SectionCard';
import { LOADING_LABELS } from '../utils/uiLabels';

function Dashboard({ sociedadId }) {
  const { stats, recentDocs, loading } = useDashboard({ sociedadId });

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver el dashboard.</p>;
  }

  if (loading) return <LoadingState label={LOADING_LABELS.dashboard} />;

  const resumenEstados = stats.resumenEstados || {};
  const cuentasPorPagar = stats.cuentasPorPagar || {};
  const vencidas = stats.vencidas || {};
  const porVencer7Dias = stats.porVencer7Dias || {};
  const retencionesPendientes = stats.retencionesPendientes || {};
  const topProveedores = stats.topProveedoresPorPagar || [];
  const cards = [
    {
      title: 'Total por pagar',
      value: cuentasPorPagar.documentos ?? 0,
      trend: `Monto: ${formatAmount(cuentasPorPagar.monto ?? 0)}`,
      tone: 'primary',
      icon: 'TP',
    },
    {
      title: 'Vencidas',
      value: vencidas.documentos ?? 0,
      trend: `Monto: ${formatAmount(vencidas.monto ?? 0)}`,
      tone: 'danger',
      icon: 'V',
    },
    {
      title: 'Por vencer (7 dias)',
      value: porVencer7Dias.documentos ?? 0,
      trend: `Monto: ${formatAmount(porVencer7Dias.monto ?? 0)}`,
      tone: 'warning',
      icon: '7D',
    },
    {
      title: 'Retencion pendiente',
      value: retencionesPendientes.documentos ?? 0,
      trend: `Monto: ${formatAmount(retencionesPendientes.monto ?? 0)}`,
      tone: 'info',
      icon: 'RP',
    },
    {
      title: 'No contabilizadas',
      value: resumenEstados.no_contabilizadas ?? 0,
      trend: 'Operacion interna',
      tone: 'info',
      icon: 'NC',
    },
  ];
  const totalesPorMoneda = stats.totalesPorMoneda || {};
  const monedas = Object.keys(totalesPorMoneda);

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="fw-bold">Bienvenido, admin!</h2>
        <div className="text-muted">Resumen general del sistema</div>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-12 col-md-6 col-xl-4" key={card.title}>
            <div className="card stat-card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="stat-title">{card.title}</div>
                    <div className="stat-value">{card.value}</div>
                    <div className="stat-trend">{card.trend}</div>
                  </div>
                  <div className={`stat-icon bg-soft-${card.tone}`}>{card.icon}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <SectionCard title="Documentos recientemente actualizados" className="section-card">
            <div className="activity-list">
              {recentDocs.length === 0 && (
                <EmptyState className="py-2">Sin actualizaciones recientes.</EmptyState>
              )}
              {recentDocs.map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="dot bg-primary" />
                  <div>
                    <div className="activity-text">
                      <Link to={`/facturas/${item.factura_id}`} className="text-decoration-none">
                        Documento #{item.consecutivo || item.clave || item.factura_id}
                      </Link>
                      {' - '}
                      {item.estado_anterior || 'sin estado'}
                      {' -> '}
                      {item.estado_nuevo}
                    </div>
                    <div className="activity-meta">
                      {item.usuario || 'sistema'} - {formatRelativeTime(item.creado_en)}
                    </div>
                    {item.motivo && <div className="text-muted small">{item.motivo}</div>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="col-12 col-lg-5 d-flex flex-column gap-3">
          <SectionCard title="Top proveedores por pagar" className="section-card">
            {topProveedores.length === 0 && (
              <EmptyState className="py-2">Sin proveedores pendientes.</EmptyState>
            )}
            {topProveedores.length > 0 && (
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
                    {topProveedores.map((proveedor) => (
                      <tr key={proveedor.proveedorId}>
                        <td>
                          <div className="fw-semibold">{proveedor.proveedorNombre}</div>
                          <div className="text-muted small">
                            {proveedor.proveedorIdentificacion || 'Sin identificacion'}
                          </div>
                        </td>
                        <td>{proveedor.documentos}</td>
                        <td>{formatAmount(proveedor.totalAPagar)}</td>
                        <td>{formatAmount(proveedor.totalRetencionPendiente)}</td>
                        <td>{formatAmount(proveedor.totalPendienteGlobal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Totales por moneda (neto a pagar)" className="section-card">
            {monedas.length === 0 && <EmptyState className="py-2">Sin datos de montos.</EmptyState>}
            {monedas.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Moneda</th>
                      <th>No contabilizadas</th>
                      <th>Contabilizadas</th>
                      <th>En tramite</th>
                      <th>Pagadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monedas.map((moneda) => {
                      const row = totalesPorMoneda[moneda] || {};
                      const noConta = row.no_contabilizadas || { count: 0, total: 0 };
                      const conta = row.contabilizadas || { count: 0, total: 0 };
                      const enTramite = row.en_tramite || { count: 0, total: 0 };
                      const pagadas = row.pagadas || { count: 0, total: 0 };
                      return (
                        <tr key={moneda}>
                          <td className="fw-semibold">{moneda}</td>
                          <td>
                            {noConta.count} / {formatAmount(noConta.total)}
                          </td>
                          <td>
                            {conta.count} / {formatAmount(conta.total)}
                          </td>
                          <td>
                            {enTramite.count} / {formatAmount(enTramite.total)}
                          </td>
                          <td>
                            {pagadas.count} / {formatAmount(pagadas.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
