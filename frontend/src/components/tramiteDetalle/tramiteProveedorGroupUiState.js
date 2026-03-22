const buildIdsSignature = (items, pick) => (
  Array.isArray(items) ? items.map((item) => String(pick(item) ?? '')).join('|') : ''
);

export const buildInitialLineSelections = (group) => Object.fromEntries(
  (group?.lines || []).map((line) => [
    line.line_key,
    line.matched_factura_id ? String(line.matched_factura_id) : '',
  ]),
);

export const buildInitialProviderFacturaId = (group) => {
  const hasResolvedProvider = Boolean(group?.proveedor_id);
  const hasSingleProviderOption = Number(group?.provider_document_options?.length || 0) <= 1;
  const initialProviderFacturaId = hasResolvedProvider || hasSingleProviderOption
    ? (
      group?.documents?.[0]?.factura_id
      || group?.available_documents?.[0]?.factura_id
      || group?.provider_document_options?.[0]?.factura_id
      || ''
    )
    : '';

  return initialProviderFacturaId ? String(initialProviderFacturaId) : '';
};

export const buildTramiteProveedorGroupScope = (group) => [
  String(group?.group_key || ''),
  String(group?.proveedor_id || ''),
  buildIdsSignature(group?.provider_document_options, (option) => option?.factura_id),
  buildIdsSignature(group?.available_documents, (document) => document?.factura_id),
  buildIdsSignature(group?.documents, (document) => document?.factura_id),
  buildIdsSignature(group?.lines, (line) => `${line?.line_key ?? ''}:${line?.matched_factura_id ?? ''}`),
].join('::');

export const buildScopedGroupStateValue = ({
  scope = '',
  state,
  fallback,
}) => (state?.scope === scope ? state.value : fallback);
