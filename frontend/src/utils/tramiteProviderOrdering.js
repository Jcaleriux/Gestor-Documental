const normalizeProviderLabel = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .trim();

const getProviderLabelFromDocument = (documento) => (
  documento?.proveedor_nombre
  || documento?.emisor?.Nombre
  || documento?.emisor?.nombre
  || ''
);

const getProviderLabelFromGroup = (group) => (
  group?.proveedor_nombre
  || group?.provider_raw_name
  || ''
);

const toDirectionFactor = (direction) => (direction === 'desc' ? -1 : 1);

const compareText = (left, right, direction) => (
  normalizeProviderLabel(left).localeCompare(normalizeProviderLabel(right)) * toDirectionFactor(direction)
);

export const sortProviderGroupsByProveedor = ({
  providerGroups = [],
  direction = 'asc'
}) => (
  [...(Array.isArray(providerGroups) ? providerGroups : [])]
    .sort((left, right) => compareText(
      getProviderLabelFromGroup(left),
      getProviderLabelFromGroup(right),
      direction
    ))
);

export const buildFacturaOrderIndexMap = (providerGroups = []) => {
  const map = new Map();

  (Array.isArray(providerGroups) ? providerGroups : []).forEach((group) => {
    const invoiceOrder = Array.isArray(group?.invoice_order)
      ? group.invoice_order
      : (Array.isArray(group?.documents) ? group.documents.map((doc) => doc?.factura_id) : []);

    invoiceOrder.forEach((facturaId, index) => {
      map.set(Number(facturaId), index + 1);
    });
  });

  return map;
};

export const sortDocumentosByProveedor = ({
  documentos = [],
  providerGroups = [],
  direction = 'asc'
}) => {
  const orderIndexMap = buildFacturaOrderIndexMap(providerGroups);
  const factor = toDirectionFactor(direction);

  return [...(Array.isArray(documentos) ? documentos : [])].sort((left, right) => {
    const byProvider = compareText(
      getProviderLabelFromDocument(left),
      getProviderLabelFromDocument(right),
      direction
    );
    if (byProvider !== 0) {
      return byProvider;
    }

    const leftOrder = Number(orderIndexMap.get(Number(left?.factura_id)) || 999999);
    const rightOrder = Number(orderIndexMap.get(Number(right?.factura_id)) || 999999);
    if (leftOrder !== rightOrder) {
      return (leftOrder - rightOrder) * factor;
    }

    const leftConsecutivo = String(left?.consecutivo || left?.clave || left?.factura_id || '');
    const rightConsecutivo = String(right?.consecutivo || right?.clave || right?.factura_id || '');
    return leftConsecutivo.localeCompare(rightConsecutivo) * factor;
  });
};
