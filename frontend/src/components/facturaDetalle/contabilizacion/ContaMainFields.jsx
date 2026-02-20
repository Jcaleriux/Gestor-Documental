import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels';

function ContaMainFields({ conta, handleContaChange, proveedoresSociedad }) {
  return (
    <>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.fechaVencimiento}</label>
        <input
          type="date"
          className="form-control"
          value={conta.fecha_vencimiento}
          onChange={handleContaChange('fecha_vencimiento')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.fechaContabilizacion}</label>
        <input
          type="date"
          className="form-control"
          value={conta.fecha_contabilizacion}
          onChange={handleContaChange('fecha_contabilizacion')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.plazoCredito}</label>
        <input
          type="number"
          className="form-control"
          value={conta.plazo_credito}
          onChange={handleContaChange('plazo_credito')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.retencion}</label>
        <input
          type="number"
          className="form-control"
          value={conta.retencion}
          onChange={handleContaChange('retencion')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.descuento}</label>
        <input
          type="number"
          className="form-control"
          value={conta.descuento}
          onChange={handleContaChange('descuento')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.anticipoAplicado}</label>
        <input
          type="number"
          className="form-control"
          value={conta.anticipo_aplicado}
          onChange={handleContaChange('anticipo_aplicado')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.montoNotaCredito}</label>
        <input
          type="number"
          min="0"
          step="0.01"
          className="form-control"
          value={conta.monto_nota_credito}
          onChange={handleContaChange('monto_nota_credito')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.centroCosto}</label>
        <input
          className="form-control"
          value={conta.centro_costo}
          onChange={handleContaChange('centro_costo')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.cuentaContable}</label>
        <input
          className="form-control"
          value={conta.cuenta_contable}
          onChange={handleContaChange('cuenta_contable')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.proyecto}</label>
        <input
          className="form-control"
          value={conta.proyecto}
          onChange={handleContaChange('proyecto')}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.ordenCompra}</label>
        <input
          className="form-control"
          value={conta.orden_compra}
          onChange={handleContaChange('orden_compra')}
        />
      </div>

      <div className="col-12">
        <label className="form-label">Proveedor</label>
        <select
          className="form-select"
          value={conta.proveedor_id}
          onChange={handleContaChange('proveedor_id')}
        >
          <option value="">Seleccionar proveedor</option>
          {proveedoresSociedad.map((prov) => (
            <option key={prov.id} value={prov.id}>
              {prov.nombre} - {prov.identificacion_numero}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default ContaMainFields;
