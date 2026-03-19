import { withAuthToken } from '../../utils/auth.js';
import { TIQUETES_ELECTRONICOS_LABELS } from '../../utils/uiLabels.js';

function TiqueteRowActions({
  tiquete,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
}) {
  const isOpen = openMenuId === tiquete.id;
  const pdfUrl = tiquete.ruta_pdf
    ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(tiquete.ruta_pdf)}`)
    : '';
  const xmlUrl = tiquete.ruta_xml
    ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(tiquete.ruta_xml)}`)
    : '';

  return (
    <div className="factura-actions" data-factura-menu="true">
      {pdfUrl ? (
        <a
          className="btn btn-sm btn-outline-primary"
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
        >
          {TIQUETES_ELECTRONICOS_LABELS.primaryAction}
        </a>
      ) : (
        <button className="btn btn-sm btn-outline-secondary" type="button" disabled>
          {TIQUETES_ELECTRONICOS_LABELS.primaryAction}
        </button>
      )}
      <div className={`factura-actions-menu${isOpen ? ' open' : ''}`} data-factura-menu="true">
        <button
          className="btn btn-sm btn-light factura-actions-trigger"
          type="button"
          onClick={() => onToggleMenu(tiquete.id)}
          aria-expanded={isOpen}
          aria-label={TIQUETES_ELECTRONICOS_LABELS.actionsButton}
        >
          ...
        </button>
        {isOpen ? (
          <div className="factura-actions-popover" role="menu" data-factura-menu="true">
            {xmlUrl ? (
              <a
                className="factura-actions-item"
                href={xmlUrl}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                onClick={onCloseMenu}
              >
                {TIQUETES_ELECTRONICOS_LABELS.actionsMenu.openXml}
              </a>
            ) : (
              <button
                type="button"
                className="factura-actions-item disabled"
                disabled
              >
                <span>{TIQUETES_ELECTRONICOS_LABELS.actionsMenu.openXml}</span>
                <span>{TIQUETES_ELECTRONICOS_LABELS.actionsMenu.unavailable}</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TiqueteRowActions;
