import { withAuthToken } from '../../utils/auth.js';
import { NOTAS_CREDITO_LABELS } from '../../utils/uiLabels.js';

function NotaCreditoRowActions({
  nota,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
}) {
  const isOpen = openMenuId === nota.id;
  const pdfUrl = nota.ruta_pdf
    ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(nota.ruta_pdf)}`)
    : '';
  const actions = [
    {
      key: 'xml',
      label: NOTAS_CREDITO_LABELS.actionsMenu.openXml,
      url: nota.ruta_xml
        ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(nota.ruta_xml)}`)
        : '',
      disabled: !nota.ruta_xml,
    },
    {
      key: 'manifest',
      label: NOTAS_CREDITO_LABELS.actionsMenu.viewManifest,
      url: nota.ruta_xml || nota.ruta_pdf
        ? withAuthToken(`/api/notas-credito/${nota.id}/manifest`)
        : '',
      disabled: !nota.ruta_xml && !nota.ruta_pdf,
    },
  ];

  return (
    <div className="factura-actions" data-factura-menu="true">
      {pdfUrl ? (
        <a
          className="btn btn-sm btn-outline-primary"
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
        >
          {NOTAS_CREDITO_LABELS.primaryAction}
        </a>
      ) : (
        <button className="btn btn-sm btn-outline-secondary" type="button" disabled>
          {NOTAS_CREDITO_LABELS.primaryAction}
        </button>
      )}
      <div className={`factura-actions-menu${isOpen ? ' open' : ''}`} data-factura-menu="true">
        <button
          className="btn btn-sm btn-light factura-actions-trigger"
          type="button"
          onClick={() => onToggleMenu(nota.id)}
          aria-expanded={isOpen}
          aria-label={NOTAS_CREDITO_LABELS.actionsButton}
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
                  <span>{NOTAS_CREDITO_LABELS.actionsMenu.unavailable}</span>
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

export default NotaCreditoRowActions;
