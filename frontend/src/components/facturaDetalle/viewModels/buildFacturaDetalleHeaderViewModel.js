import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels.js';

export const buildFacturaDetalleHeaderViewModel = ({ factura }) => {
  const documentoPrincipal = factura?.consecutivo || factura?.numero_consecutivo || factura?.id || '';

  return {
    title: FACTURA_DETALLE_LABELS.header.title,
    subtitle: documentoPrincipal ? `Factura #${documentoPrincipal}` : FACTURA_DETALLE_LABELS.header.subtitle,
    backTo: '/facturas',
    backLabel: FACTURA_DETALLE_LABELS.header.back
  };
};
