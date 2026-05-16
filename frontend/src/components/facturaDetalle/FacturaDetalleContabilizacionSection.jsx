import ActionAlerts from '../common/ActionAlerts';
import SectionCard from '../common/SectionCard';
import StatusBadge from '../common/StatusBadge';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';
import SelectionListModal from './contabilizacion/SelectionListModal';
import CentroCostoSelectionModal from './contabilizacion/CentroCostoSelectionModal';
import ContaMainFields from './contabilizacion/ContaMainFields';
import ContaAssociationsActions from './contabilizacion/ContaAssociationsActions';
import ContaTotalsSummary from './contabilizacion/ContaTotalsSummary';
import RetencionPagoPanel from './contabilizacion/RetencionPagoPanel';

const resolveSavingLabel = (contaSavingAction) => {
  switch (contaSavingAction) {
    case 'save_draft':
      return FACTURA_DETALLE_LABELS.contabilizacion.saveDraftSaving;
    case 'mark_in_review':
      return FACTURA_DETALLE_LABELS.contabilizacion.markInReviewSaving;
    case 'finalize':
    default:
      return FACTURA_DETALLE_LABELS.contabilizacion.finalizeSaving;
  }
};

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
    canEditContabilizacion,
    isReadOnly,
    facturaEstado,
    contaSaving,
    contaSavingAction,
    contaMessage,
    contaError,
    handleContaChange,
    guardarBorrador,
    marcarEnRevision,
    guardarContabilizacion
  } = form;

  const showMarkInReview = canEditContabilizacion && facturaEstado !== 'en_revision';

  return (
    <SectionCard
      title={FACTURA_DETALLE_LABELS.contabilizacion.title}
      className="mb-3 factura-conta-panel"
      actions={(
        <StatusBadge
          label={isReadOnly
            ? FACTURA_DETALLE_LABELS.header.modeReadOnly
            : FACTURA_DETALLE_LABELS.header.modeEditable}
          className={isReadOnly ? 'badge-soft-secondary' : 'badge-soft-success'}
        />
      )}
    >
      <div className="factura-conta-mode-copy mb-3">
        {isReadOnly
          ? FACTURA_DETALLE_LABELS.contabilizacion.modeHelpReadOnly
          : FACTURA_DETALLE_LABELS.contabilizacion.modeHelpEditable}
      </div>

      <form className="row g-2">
        <ContaMainFields
          conta={conta}
          centrosCostoCatalogo={form.centrosCostoCatalogo}
          handleContaChange={handleContaChange}
          addCentroCostoLinea={form.addCentroCostoLinea}
          removeCentroCostoLinea={form.removeCentroCostoLinea}
          abrirSelectorCentrosCosto={form.abrirSelectorCentrosCosto}
          seleccionarCentroCostoEnLinea={form.seleccionarCentroCostoEnLinea}
          disabled={isReadOnly}
        />

        <ContaAssociationsActions
          viewModel={{
            conta,
            ...associations
          }}
        />

        <div className="col-12">
          <div className="factura-conta-group-title">{FACTURA_DETALLE_LABELS.contabilizacion.totales}</div>
        </div>

        <ContaTotalsSummary
          viewModel={{
            conta,
            ...totals
          }}
        />

        <RetencionPagoPanel viewModel={retencion} />

        {canEditContabilizacion && modals.tablas.isOpen && (
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

        {canEditContabilizacion && modals.notas.isOpen && (
          <SelectionListModal
            title="Seleccionar nota de crédito"
            error={modals.notas.error}
            items={modals.notas.items}
            emptyMessage="No hay notas de crédito para este proveedor."
            onClose={modals.notas.onClose}
            onSelect={modals.notas.onSelect}
            renderLabel={modals.notas.renderLabel}
          />
        )}

        {canEditContabilizacion && modals.ordenes.isOpen && (
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

        {canEditContabilizacion && modals.centrosCosto.isOpen && (
          <CentroCostoSelectionModal
            title="Seleccionar centro de costo"
            error={modals.centrosCosto.error}
            loading={modals.centrosCosto.loading}
            items={modals.centrosCosto.items}
            targetLineId={modals.centrosCosto.targetLineId}
            onClose={modals.centrosCosto.onClose}
            onSelect={modals.centrosCosto.onSelect}
          />
        )}

        <div className="col-12">
          <div className="factura-field-label-row">
            <label className="form-label mb-0">{FACTURA_DETALLE_LABELS.contabilizacion.notas}</label>
            <button
              type="button"
              className="factura-help-icon"
              title={FACTURA_DETALLE_LABELS.contabilizacion.notasTooltip}
              aria-label={FACTURA_DETALLE_LABELS.contabilizacion.notasTooltip}
            >
              i
            </button>
          </div>
          <textarea
            className="form-control"
            rows="3"
            value={conta.notas}
            onChange={handleContaChange('notas')}
            disabled={isReadOnly}
          />
          <div className="factura-field-help">
            {FACTURA_DETALLE_LABELS.contabilizacion.notasHelp}
          </div>
        </div>

        <ActionAlerts error={contaError} message={contaMessage} className="small" />

        {canEditContabilizacion ? (
          <div className="col-12">
            <div className="factura-conta-actions">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={guardarBorrador}
                disabled={contaSaving}
              >
                {contaSaving && contaSavingAction === 'save_draft'
                  ? resolveSavingLabel(contaSavingAction)
                  : FACTURA_DETALLE_LABELS.contabilizacion.saveDraft}
              </button>

              {showMarkInReview ? (
                <button
                  className="btn btn-outline-primary"
                  type="button"
                  onClick={marcarEnRevision}
                  disabled={contaSaving}
                >
                  {contaSaving && contaSavingAction === 'mark_in_review'
                    ? resolveSavingLabel(contaSavingAction)
                    : FACTURA_DETALLE_LABELS.contabilizacion.markInReview}
                </button>
              ) : null}

              <button
                className="btn btn-success"
                type="button"
                onClick={guardarContabilizacion}
                disabled={contaSaving}
              >
                {contaSaving && contaSavingAction === 'finalize'
                  ? resolveSavingLabel(contaSavingAction)
                  : FACTURA_DETALLE_LABELS.contabilizacion.finalize}
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}

export default FacturaDetalleContabilizacionSection;
