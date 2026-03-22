export const buildListScopeKey = ({
  items = [],
  resetKey = '',
} = {}) => {
  const itemIds = Array.isArray(items)
    ? items.map((item) => String(item?.id ?? '')).join('|')
    : '';

  return `${String(resetKey || '')}::${itemIds}`;
};

export const readScopedValue = (state, scopeKey, field, fallback) => (
  state?.scopeKey === scopeKey ? state?.[field] ?? fallback : fallback
);
