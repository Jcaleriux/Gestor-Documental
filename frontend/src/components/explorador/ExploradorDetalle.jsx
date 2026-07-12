import { Link } from 'react-router-dom';
import {
  formatDate,
  formatEstado,
  formatMoney,
  getCostCenterLabels,
} from './exploradorDocumentosView.js';

function DetailLine({ label, value }) {
  return <div className="explorer-detail-line"><span>{label}</span><strong>{value || 'No registrado'}</strong></div>;
}

function ExploradorDetalle({ documento }) {
  if (!documento) {
    return (
      <aside className="explorer-detail explorer-detail-empty">
        <strong>Seleccione un documento</strong>
        <span>El detalle contable y de pago aparecera aqui.</span>
      </aside>
    );
  }

  const centers = getCostCenterLabels(documento);
  return (
    <aside className="explorer-detail" aria-label={`Detalle de ${documento.consecutivo}`}>
      <div className="explorer-detail-header">
        <div>
          <span className="explorer-detail-kicker">Factura</span>
          <h3>{documento.consecutivo}</h3>
        </div>
        <span className={`explorer-state explorer-state-${documento.estado}`}>{formatEstado(documento.estado)}</span>
      </div>
      <div className="explorer-detail-provider">
        <strong>{documento.proveedorNombre}</strong>
        <span>{documento.proveedorIdentificacion || 'Sin identificacion'}</span>
      </div>
      <div className="explorer-detail-amounts">
        <div><span>Total</span><strong>{formatMoney(documento.total, documento.moneda)}</strong></div>
        <div><span>Pendiente</span><strong>{formatMoney(documento.pendienteGlobal, documento.moneda)}</strong></div>
      </div>
      <div className="explorer-detail-section">
        <h4>Documento</h4>
        <DetailLine label="Emision" value={formatDate(documento.fechaEmision)} />
        <DetailLine label="Vencimiento" value={formatDate(documento.contabilizacion.fechaVencimiento)} />
        <DetailLine label="Soportes" value={[documento.tieneXml && 'XML', documento.tienePdf && 'PDF'].filter(Boolean).join(' · ') || 'Sin archivos'} />
      </div>
      <div className="explorer-detail-section">
        <h4>Contabilizacion</h4>
        <DetailLine label="Cuenta" value={documento.contabilizacion.cuentaContable} />
        <DetailLine label="Centros de costo" value={centers.join(', ')} />
        <DetailLine label="Proyecto" value={documento.contabilizacion.proyecto} />
        <DetailLine label="Orden de compra" value={documento.contabilizacion.ordenCompra} />
        <DetailLine label="Retencion pendiente" value={formatMoney(documento.retencionPendiente, documento.moneda)} />
      </div>
      {documento.tramite && (
        <div className="explorer-detail-section">
          <h4>Tramite #{documento.tramite.id}</h4>
          <DetailLine label="Estado" value={formatEstado(documento.tramite.estado)} />
          <DetailLine label="Tesoreria" value={formatEstado(documento.tramite.estadoTesoreria)} />
        </div>
      )}
      <div className="explorer-detail-actions">
        <Link className="btn btn-primary" to={`/facturas/${documento.id}/contabilizacion`}>Ver factura</Link>
        {documento.tramite && <Link className="btn btn-outline-secondary" to={`/tramites/${documento.tramite.id}`}>Ver tramite</Link>}
      </div>
    </aside>
  );
}

export default ExploradorDetalle;
