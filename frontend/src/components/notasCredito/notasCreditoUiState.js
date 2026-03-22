export const buildNotasCreditoViewScope = ({
  sociedadId = '',
} = {}) => String(sociedadId || '');

export const buildScopedPanelVisible = ({
  scope = '',
  state,
}) => Boolean(state?.scope === scope && state?.visible);
