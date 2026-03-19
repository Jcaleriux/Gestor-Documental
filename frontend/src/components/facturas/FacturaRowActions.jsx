import { Link } from 'react-router-dom';
import { withAuthToken } from '../../utils/auth.js';
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
      url: factura.ruta_pdf
        ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(factura.ruta_pdf)}`)
        : '',
      disabled: !factura.ruta_pdf,
    },
    {
      key: 'xml',
      label: FACTURAS_LABELS.actionsMenu.openXml,
      url: factura.ruta_xml
        ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(factura.ruta_xml)}`)
        : '',
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
      url: factura.ruta_xml || factura.ruta_pdf
        ? withAuthToken(`/api/facturas/${factura.id}/manifest`)
        : '',
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
              ) : action.onClick ? (
                <button
                  key={action.key}
                  type="button"
                  className="factura-actions-item"
                  role="menuitem"
                  onClick={() => {
                    onCloseMenu();
                    action.onClick();
                  }}
                >
                  {action.label}
                </button>
              ) : (
                <a
                  key={action.key}
                  className="factura-actions-item"
                  href={action.url}
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  onClick={onCloseMenu}
                >
                  {action.label}
                </a>
              )
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default FacturaRowActions;
