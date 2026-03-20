import { Link } from 'react-router-dom';
import { openProtectedInNewTab } from '../../utils/protectedResources.js';
import { FACTURAS_LABELS } from '../../utils/uiLabels.js';

function FacturaRowActions({
  factura,
  openMenuId,
  mhLoadingId,
  onToggleMenu,
  onCloseMenu,
  onViewMh,
  canEditContabilizacion,
}) {
  const isOpen = openMenuId === factura.id;
  const isMhLoading = mhLoadingId === factura.id;
  const actions = [
    {
      key: 'pdf',
      label: FACTURAS_LABELS.actionsMenu.openPdf,
      onClick: factura.ruta_pdf
        ? () => openProtectedInNewTab(`/api/files/pdf?path=${encodeURIComponent(factura.ruta_pdf)}`)
        : null,
      disabled: !factura.ruta_pdf,
    },
    {
      key: 'xml',
      label: FACTURAS_LABELS.actionsMenu.openXml,
      onClick: factura.ruta_xml
        ? () => openProtectedInNewTab(`/api/files/xml?path=${encodeURIComponent(factura.ruta_xml)}`)
        : null,
      disabled: !factura.ruta_xml,
    },
    {
      key: 'mh',
      label: FACTURAS_LABELS.actionsMenu.viewMh,
      disabled: !factura.has_mensaje_hacienda || isMhLoading,
      onClick: () => onViewMh(factura),
    },
    {
      key: 'manifest',
      label: FACTURAS_LABELS.actionsMenu.viewManifest,
      onClick: factura.ruta_xml || factura.ruta_pdf
        ? () => openProtectedInNewTab(`/api/facturas/${factura.id}/manifest`)
        : null,
      disabled: !factura.ruta_xml && !factura.ruta_pdf,
    },
  ];

  return (
    <div className="factura-actions" data-factura-menu="true">
      <Link className="btn btn-sm btn-outline-primary" to={`/facturas/${factura.id}/contabilizacion`}>
        {canEditContabilizacion
          ? FACTURAS_LABELS.primaryActionEdit
          : FACTURAS_LABELS.primaryActionReadOnly}
      </Link>
      <div className={`factura-actions-menu${isOpen ? ' open' : ''}`} data-factura-menu="true">
        <button
          className="btn btn-sm btn-light factura-actions-trigger"
          type="button"
          onClick={() => onToggleMenu(factura.id)}
          aria-expanded={isOpen}
          aria-label={FACTURAS_LABELS.actionsButton}
        >
          ...
        </button>
        {isOpen ? (
          <div className="factura-actions-popover" role="menu" data-factura-menu="true">
            {actions.map((action) => (
              action.disabled ? (
                <button
                  key={action.key}
                  type="button"
                  className="factura-actions-item disabled"
                  disabled
                >
                  <span>{action.label}</span>
                  <span>{FACTURAS_LABELS.actionsMenu.unavailable}</span>
                </button>
              ) : (
                <button
                  key={action.key}
                  type="button"
                  className="factura-actions-item"
                  role="menuitem"
                  onClick={async () => {
                    onCloseMenu();
                    await action.onClick?.();
                  }}
                >
                  {action.label}
                </button>
              )
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default FacturaRowActions;
