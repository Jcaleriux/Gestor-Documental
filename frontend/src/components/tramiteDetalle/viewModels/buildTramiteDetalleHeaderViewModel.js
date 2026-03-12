import TRAMITE_LABELS from '../../../utils/tramiteLabels.js';

export const buildTramiteDetalleHeaderViewModel = ({ tramite }) => {
  const tramiteSuffix = tramite?.id ? ` #${tramite.id}` : '';

  return {
    title: `${TRAMITE_LABELS.pageTitle}${tramiteSuffix}`,
    subtitle: TRAMITE_LABELS.pageSubtitle,
    actionsClassName: 'tramite-actions'
  };
};
