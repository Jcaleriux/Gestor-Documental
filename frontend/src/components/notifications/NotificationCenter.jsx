import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationCenter } from '../../hooks/notifications/useNotificationCenter.js';
import { formatRelativeTime } from '../../utils/formatters.js';

const BellIcon = () => (
  <svg
    className="notification-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 21h4" strokeLinecap="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="notification-action-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path d="M20 11a8 8 0 1 0-2.35 5.65" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 5v6h-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function NotificationItem({ item, onNavigate }) {
  const content = (
    <>
      <span className={`notification-item-dot tone-${item.tone}`} aria-hidden="true" />
      <span className="notification-item-body">
        <span className="notification-item-meta">{item.category}</span>
        <span className="notification-item-title">{item.title}</span>
        <span className="notification-item-description">{item.description}</span>
      </span>
      <span className="notification-item-count" aria-label={`${item.count} pendientes`}>
        {item.count}
      </span>
    </>
  );

  if (!item.to) {
    return <div className="notification-item">{content}</div>;
  }

  return (
    <Link className="notification-item notification-item-link" to={item.to} onClick={onNavigate}>
      {content}
    </Link>
  );
}

function NotificationCenter({
  sociedadId,
  selectedSociedadName = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const {
    items,
    categorySummary,
    actionSummary,
    badgeLabel,
    updatedAt,
    loading,
    error,
    refetch,
  } = useNotificationCenter({ sociedadId });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen((previous) => !previous);
  };

  const handleRefresh = () => {
    refetch();
  };

  const closePanel = () => {
    setOpen(false);
  };

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        className={`icon-btn notification-trigger${open ? ' active' : ''}`}
        type="button"
        aria-label="Abrir centro de notificaciones"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggleOpen}
      >
        <BellIcon />
        {badgeLabel && (
          <span className="badge notification-badge" aria-label={`${badgeLabel} notificaciones`}>
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <section className="notification-panel" role="dialog" aria-label="Centro de notificaciones">
          <div className="notification-panel-header">
            <div>
              <h2>Centro de notificaciones</h2>
              <p>{selectedSociedadName || 'Sociedad seleccionada'}</p>
            </div>
            <button
              className="notification-action-btn"
              type="button"
              aria-label="Actualizar notificaciones"
              title="Actualizar"
              onClick={handleRefresh}
              disabled={!sociedadId || loading}
            >
              <RefreshIcon />
            </button>
          </div>

          <div className="notification-panel-summary" aria-live="polite">
            <span>{actionSummary}</span>
            {updatedAt && <span>Actualizado {formatRelativeTime(updatedAt)}</span>}
          </div>

          {categorySummary.length > 0 && (
            <div className="notification-category-strip" aria-label="Resumen por categoria">
              {categorySummary.map((entry) => (
                <span className="notification-category-chip" key={entry.category}>
                  {entry.category}: {entry.count}
                </span>
              ))}
            </div>
          )}

          <div className="notification-panel-body">
            {!sociedadId && (
              <div className="notification-empty">
                Seleccione una sociedad para ver notificaciones operativas.
              </div>
            )}

            {sociedadId && error && (
              <div className="notification-error" role="alert">
                <span>{error}</span>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleRefresh}>
                  Reintentar
                </button>
              </div>
            )}

            {sociedadId && loading && items.length === 0 && (
              <div className="notification-empty">Cargando notificaciones...</div>
            )}

            {sociedadId && !loading && !error && items.length === 0 && (
              <div className="notification-empty">No hay acciones pendientes para esta sociedad.</div>
            )}

            {sociedadId && items.length > 0 && (
              <div className="notification-list">
                {items.map((item) => (
                  <NotificationItem item={item} key={item.id} onNavigate={closePanel} />
                ))}
              </div>
            )}
          </div>

          <div className="notification-panel-footer">
            <Link to="/" onClick={closePanel}>Abrir dashboard</Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default NotificationCenter;
