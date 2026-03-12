import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels.js';

export const buildFacturaDetalleHeaderViewModel = ({ factura }) => {
  const facturaSuffix = factura?.id ? ` #${factura.id}` : '';

  return {
    title: `${FACTURA_DETALLE_LABELS.header.title}${facturaSuffix}`,
    subtitle: FACTURA_DETALLE_LABELS.header.subtitle,
    backTo: '/facturas',
    backLabel: FACTURA_DETALLE_LABELS.header.back
  };
};
