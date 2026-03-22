import { openProtectedInNewTab } from '../../utils/protectedResources.js';
import { TIQUETES_ELECTRONICOS_LABELS } from '../../utils/uiLabels.js';

function TiqueteRowActions({
  tiquete,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
}) {
  const isOpen = openMenuId === tiquete.id;

  return (
    <div className="factura-actions" data-factura-menu="true">
      {tiquete.ruta_pdf ? (
        <button
          className="btn btn-sm btn-outline-primary"
          type="button"
          onClick={() => openProtectedInNewTab(`/api/files/pdf?path=${encodeURIComponent(tiquete.ruta_pdf)}`)}
        >
          {TIQUETES_ELECTRONICOS_LABELS.primaryAction}
        </button>
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
            {tiquete.ruta_xml ? (
              <button
                className="factura-actions-item"
                type="button"
                role="menuitem"
                onClick={async () => {
                  onCloseMenu();
                  await openProtectedInNewTab(`/api/files/xml?path=${encodeURIComponent(tiquete.ruta_xml)}`);
                }}
              >
                {TIQUETES_ELECTRONICOS_LABELS.actionsMenu.openXml}
              </button>
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
