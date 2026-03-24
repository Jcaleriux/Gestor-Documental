import { useEffect, useMemo, useState } from 'react';

const createInitialOrder = (documents) => (
  Array.isArray(documents) ? documents.map((doc) => Number(doc.factura_id)) : []
);

function SortableFacturaList({
  documents = [],
  disabled = false,
  onOrderChange = null,
}) {
  const initialOrder = useMemo(() => createInitialOrder(documents), [documents]);
  const [orderState, setOrderState] = useState(initialOrder);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    setOrderState(initialOrder);
  }, [initialOrder]);

  const order = useMemo(() => {
    const baseOrder = orderState.length === initialOrder.length ? orderState : initialOrder;
    const docsById = new Map(documents.map((doc) => [Number(doc.factura_id), doc]));
    return baseOrder.map((facturaId) => docsById.get(Number(facturaId))).filter(Boolean);
  }, [documents, initialOrder, orderState]);

  const applyOrder = (nextIds) => {
    setOrderState(nextIds);
    if (typeof onOrderChange === 'function') {
      onOrderChange(nextIds);
    }
  };

  const moveItem = (targetId) => {
    if (disabled || draggingId === null || draggingId === targetId) {
      return;
    }

    const currentIds = order.map((doc) => Number(doc.factura_id));
    const fromIndex = currentIds.indexOf(Number(draggingId));
    const toIndex = currentIds.indexOf(Number(targetId));
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextIds = [...currentIds];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);
    applyOrder(nextIds);
  };

  return (
    <div className="d-flex flex-column gap-2">
      {order.map((doc, index) => (
        <div
          key={doc.factura_id}
          className="border rounded p-2 bg-white"
          draggable={!disabled}
          onDragStart={() => setDraggingId(Number(doc.factura_id))}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            moveItem(Number(doc.factura_id));
            setDraggingId(null);
          }}
          onDragEnd={() => setDraggingId(null)}
          style={{ cursor: disabled ? 'default' : 'grab' }}
        >
          <div className="fw-semibold small">{index + 1}. #{doc.consecutivo || doc.clave || doc.factura_id}</div>
          <div className="small text-muted">{doc.proveedor_nombre || doc.emisor?.Nombre || doc.emisor?.nombre || '-'}</div>
        </div>
      ))}
    </div>
  );
}

export default SortableFacturaList;
