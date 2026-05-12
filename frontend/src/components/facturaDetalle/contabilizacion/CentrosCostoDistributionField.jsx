import { useMemo, useState } from 'react';
import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels';
import {
  filterCentrosCosto,
  formatCentroCostoLabel,
  getCentroCostoAprobadorDetalle,
  getCentroCostoAprobadorNombre,
} from '../../../utils/centrosCosto.js';
import { buildCentroCostoLineScope } from './centroCostoLineScope.js';

function CentroCostoLine({
  line,
  catalogo,
  disabled,
  onSelect,
  onRemove,
  onOpenModal,
  canRemove,
}) {
  const currentScope = buildCentroCostoLineScope(line);
  const [interactionState, setInteractionState] = useState(() => ({
    scope: currentScope,
    query: '',
    showSuggestions: false,
  }));
  const query = interactionState.scope === currentScope ? interactionState.query : '';
  const showSuggestions = interactionState.scope === currentScope
    ? interactionState.showSuggestions
    : false;

  const suggestions = useMemo(() => {
    const baseItems = filterCentrosCosto(catalogo, {
      query,
      includeInactive: false,
      onlySelectable: true,
    });

    return query ? baseItems.slice(0, 8) : baseItems.slice(0, 8);
  }, [catalogo, query]);

  const inputValue = query || (line.codigo ? formatCentroCostoLabel(line) : '');

  return (
    <div className="cc-line-item">
      <div className="cc-line-main">
        <label className="form-label mb-1">{FACTURA_DETALLE_LABELS.contabilizacion.centroCosto}</label>
        <div className="position-relative">
          <input
            className="form-control"
            value={inputValue}
            placeholder={FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoBuscar}
            onChange={(event) => {
              setInteractionState({
                scope: currentScope,
                query: event.target.value,
                showSuggestions: true,
              });
            }}
            onFocus={() => {
              setInteractionState((previous) => ({
                scope: currentScope,
                query: previous.scope === currentScope ? previous.query : '',
                showSuggestions: true,
              }));
            }}
            onBlur={() => {
              window.setTimeout(() => {
                setInteractionState((previous) => ({
                  scope: currentScope,
                  query: line.codigo ? '' : (previous.scope === currentScope ? previous.query : ''),
                  showSuggestions: false,
                }));
              }, 120);
            }}
            disabled={disabled}
          />

          {!disabled && showSuggestions && suggestions.length > 0 ? (
            <div className="cc-suggestions list-group">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="list-group-item list-group-item-action"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(line.local_id, item);
                    setInteractionState({
                      scope: buildCentroCostoLineScope(item),
                      query: '',
                      showSuggestions: false,
                    });
                  }}
                >
                  <div className="fw-semibold">{formatCentroCostoLabel(item)}</div>
                  <div className="small text-muted">
                    {getCentroCostoAprobadorNombre(item) || 'Sin aprobador'}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="cc-line-side">
        <label className="form-label mb-1">{FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoAprobador}</label>
        <div className="cc-line-approver">
          <div>{getCentroCostoAprobadorNombre(line) || 'Sin aprobador'}</div>
          <div className="small text-muted">{getCentroCostoAprobadorDetalle(line) || 'Sin detalle'}</div>
        </div>
      </div>

      <div className="cc-line-actions">
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          onClick={() => {
            setInteractionState({
              scope: currentScope,
              query: '',
              showSuggestions: false,
            });
            onOpenModal(line.local_id);
          }}
          disabled={disabled}
        >
          {FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoVerTodos}
        </button>
        <button
          className="btn btn-outline-danger btn-sm"
          type="button"
          onClick={() => onRemove(line.local_id)}
          disabled={disabled}
        >
          {canRemove ? 'Quitar' : 'Limpiar'}
        </button>
      </div>
    </div>
  );
}

function CentrosCostoDistributionField({
  conta,
  centrosCostoCatalogo,
  disabled = false,
  onAddLine,
  onRemoveLine,
  onOpenModal,
  onSelectLine,
}) {
  const lineas = Array.isArray(conta?.metadata?.centros_costo_lineas)
    ? conta.metadata.centros_costo_lineas
    : [];

  const hasCatalog = Array.isArray(centrosCostoCatalogo) && centrosCostoCatalogo.length > 0;
  const canAddMore = !disabled && hasCatalog;

  return (
    <div className="col-12">
      <div className="factura-field-label-row">
        <label className="form-label mb-0">{FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoDistribucion}</label>
        {canAddMore ? (
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={onAddLine}
          >
            {FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoAgregarLinea}
          </button>
        ) : null}
      </div>

      <div className="cc-config-note">
        {FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoBudgetPending}
      </div>

      <div className="factura-field-help">
        {FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoHelp}
      </div>

      {!hasCatalog ? (
        <div className="alert alert-warning mt-2 mb-0">
          {FACTURA_DETALLE_LABELS.contabilizacion.centrosCostoSinCatalogo} Cargalo primero desde
          {' '}Administracion &gt; Centros de costo.
        </div>
      ) : null}

      <div className="cc-lines-wrap mt-3">
        {lineas.map((line) => (
          <CentroCostoLine
            key={line.local_id}
            line={line}
            catalogo={centrosCostoCatalogo}
            disabled={disabled}
            onSelect={onSelectLine}
            onRemove={onRemoveLine}
            onOpenModal={onOpenModal}
            canRemove={lineas.length > 1 || Boolean(line.centro_costo_id || line.codigo || line.nombre)}
          />
        ))}
      </div>
    </div>
  );
}

export default CentrosCostoDistributionField;
