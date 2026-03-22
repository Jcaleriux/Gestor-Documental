export const buildFacturasViewScope = ({
  sociedadId = '',
  dashboardPreset = '',
} = {}) => `${String(sociedadId || '')}::${String(dashboardPreset || '')}`;

export const buildScopedPanelVisible = ({
  scope = '',
  state,
}) => Boolean(state?.scope === scope && state?.visible);
