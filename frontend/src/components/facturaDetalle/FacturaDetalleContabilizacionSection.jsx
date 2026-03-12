import ActionAlerts from '../common/ActionAlerts';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';
import SelectionListModal from './contabilizacion/SelectionListModal';
import ContaMainFields from './contabilizacion/ContaMainFields';
import ContaAssociationsActions from './contabilizacion/ContaAssociationsActions';
import ContaTotalsSummary from './contabilizacion/ContaTotalsSummary';
import RetencionPagoPanel from './contabilizacion/RetencionPagoPanel';

function FacturaDetalleContabilizacionSection({ viewModel }) {
  const {
    form,
    associations,
    modals,
    retencion,
    totals
  } = viewModel;

  const {
    conta,
    proveedoresSociedad,
    contaSaving,
    contaMessage,
    contaError,
    handleContaChange,
    guardarContabilizacion
  } = form;

  return (
    <SectionCard title={FACTURA_DETALLE_LABELS.contabilizacion.title} className="mb-3">
      <form onSubmit={guardarContabilizacion} className="row g-2">
        <ContaMainFields
          conta={conta}
          handleContaChange={handleContaChange}
          proveedoresSociedad={proveedoresSociedad}
        />

        <ContaAssociationsActions
          viewModel={{
            conta,
            ...associations
          }}
        />

        <ContaTotalsSummary
          viewModel={{
            conta,
            ...totals
          }}
        />

        <RetencionPagoPanel
          viewModel={retencion}
        />

        {modals.tablas.isOpen && (
          <SelectionListModal
            title="Seleccionar tabla de pagos"
            error={modals.tablas.error}
            items={modals.tablas.items}
            emptyMessage="No hay tablas de pago para este proveedor."
            onClose={modals.tablas.onClose}
            onSelect={modals.tablas.onSelect}
            renderLabel={modals.tablas.renderLabel}
          />
        )}

        {modals.notas.isOpen && (
          <SelectionListModal
            title="Seleccionar nota de credito"
            error={modals.notas.error}
            items={modals.notas.items}
            emptyMessage="No hay notas de credito para este proveedor."
            onClose={modals.notas.onClose}
            onSelect={modals.notas.onSelect}
            renderLabel={modals.notas.renderLabel}
          />
        )}

        {modals.ordenes.isOpen && (
          <SelectionListModal
            title="Seleccionar orden de compra"
            error={modals.ordenes.error}
            items={modals.ordenes.items}
            emptyMessage="No hay ordenes de compra abiertas para este proveedor."
            onClose={modals.ordenes.onClose}
            onSelect={modals.ordenes.onSelect}
            renderLabel={modals.ordenes.renderLabel}
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
