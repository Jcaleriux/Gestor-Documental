import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels';
import CentrosCostoDistributionField from './CentrosCostoDistributionField.jsx';

function SectionTitle({ children }) {
  return (
    <div className="col-12">
      <div className="factura-conta-group-title">{children}</div>
    </div>
  );
}

function ContaMainFields({
  conta,
  centrosCostoCatalogo,
  handleContaChange,
  addCentroCostoLinea,
  removeCentroCostoLinea,
  abrirSelectorCentrosCosto,
  seleccionarCentroCostoEnLinea,
  disabled = false
}) {
  return (
    <>
      <SectionTitle>{FACTURA_DETALLE_LABELS.contabilizacion.fechasPlazo}</SectionTitle>

      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.fechaVencimiento}</label>
        <input
          type="date"
          className="form-control"
          value={conta.fecha_vencimiento}
          onChange={handleContaChange('fecha_vencimiento')}
          disabled={disabled}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.fechaContabilizacion}</label>
        <input
          type="date"
          className="form-control"
          value={conta.fecha_contabilizacion}
          onChange={handleContaChange('fecha_contabilizacion')}
          disabled={disabled}
        />
      </div>
      <div className="col-12">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.plazoCredito}</label>
        <input
          type="number"
          className="form-control"
          value={conta.plazo_credito}
          onChange={handleContaChange('plazo_credito')}
          disabled={disabled}
        />
      </div>

      <SectionTitle>{FACTURA_DETALLE_LABELS.contabilizacion.montosAjustes}</SectionTitle>

      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.retencion}</label>
        <input
          type="number"
          className="form-control"
          value={conta.retencion}
          onChange={handleContaChange('retencion')}
          disabled={disabled}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.descuento}</label>
        <input
          type="number"
          className="form-control"
          value={conta.descuento}
          onChange={handleContaChange('descuento')}
          disabled={disabled}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.anticipoAplicado}</label>
        <input
          type="number"
          className="form-control"
          value={conta.anticipo_aplicado}
          onChange={handleContaChange('anticipo_aplicado')}
          disabled={disabled}
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
          disabled={disabled}
        />
      </div>

      <SectionTitle>{FACTURA_DETALLE_LABELS.contabilizacion.clasificacionContable}</SectionTitle>

      <CentrosCostoDistributionField
        conta={conta}
        centrosCostoCatalogo={centrosCostoCatalogo}
        disabled={disabled}
        onAddLine={addCentroCostoLinea}
        onRemoveLine={removeCentroCostoLinea}
        onOpenModal={abrirSelectorCentrosCosto}
        onSelectLine={seleccionarCentroCostoEnLinea}
      />

      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.cuentaContable}</label>
        <input
          className="form-control"
          value={conta.cuenta_contable}
          onChange={handleContaChange('cuenta_contable')}
          disabled={disabled}
        />
      </div>
      <div className="col-12">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.ordenCompra}</label>
        <input
          className="form-control"
          value={conta.orden_compra}
          onChange={handleContaChange('orden_compra')}
          disabled={disabled}
        />
      </div>

      <SectionTitle>{FACTURA_DETALLE_LABELS.contabilizacion.relaciones}</SectionTitle>
    </>
  );
}

export default ContaMainFields;
