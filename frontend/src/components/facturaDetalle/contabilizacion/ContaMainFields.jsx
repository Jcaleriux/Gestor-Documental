import { useState } from 'react';
import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels';
import CentrosCostoDistributionField from './CentrosCostoDistributionField.jsx';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const toDisplayDate = (value) => {
  const match = String(value || '').match(ISO_DATE_PATTERN);
  if (!match) return '';

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const toIsoDate = (value) => {
  const match = String(value || '').trim().match(DISPLAY_DATE_PATTERN);
  if (!match) return '';

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isValid = date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day);

  return isValid ? `${year}-${month}-${day}` : '';
};

const normalizeDisplayDateInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 8),
  ].filter(Boolean);

  return parts.join('/');
};

function AccountingDateInput({
  value,
  onChange,
  disabled = false
}) {
  const [draftValue, setDraftValue] = useState(null);
  const displayValue = draftValue ?? toDisplayDate(value);

  const handleChange = (event) => {
    const nextDisplayValue = normalizeDisplayDateInput(event.target.value);

    setDraftValue(nextDisplayValue);

    if (nextDisplayValue === '') {
      onChange({ target: { value: '' } });
      return;
    }

    const nextIsoDate = toIsoDate(nextDisplayValue);
    if (nextIsoDate) {
      onChange({ target: { value: nextIsoDate } });
    }
  };

  const handleBlur = () => {
    setDraftValue(null);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      className="form-control"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
    />
  );
}

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
        <AccountingDateInput
          value={conta.fecha_vencimiento}
          onChange={handleContaChange('fecha_vencimiento')}
          disabled={disabled}
        />
      </div>
      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.fechaContabilizacion}</label>
        <AccountingDateInput
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

      <div className="col-6">
        <label className="form-label">{FACTURA_DETALLE_LABELS.contabilizacion.asiento}</label>
        <input
          className="form-control"
          value={conta.asiento}
          onChange={handleContaChange('asiento')}
          disabled={disabled}
        />
      </div>

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
