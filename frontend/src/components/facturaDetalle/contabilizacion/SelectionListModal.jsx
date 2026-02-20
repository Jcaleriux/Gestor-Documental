import EmptyState from '../../common/EmptyState';

function SelectionListModal({
  title,
  error,
  items,
  emptyMessage,
  onClose,
  onSelect,
  renderLabel
}) {
  return (
    <div className="col-12">
      <div className="border rounded p-2 bg-light">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>{title}</strong>
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        {error && <div className="text-danger small mb-2">{error}</div>}
        {items.length === 0 ? (
          <EmptyState className="py-2">{emptyMessage}</EmptyState>
        ) : (
          <div className="list-group">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onClick={() => onSelect(item)}
              >
                <span>{renderLabel(item)}</span>
                <span className="text-muted small">#{item.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectionListModal;
