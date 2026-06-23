import { FACTURA_DETALLE_LABELS } from '../../../utils/uiLabels.js';
import { getDocumentoConsecutivo } from '../../../utils/formatters.js';

export const buildFacturaDetalleHeaderViewModel = ({ factura }) => {
  const documentoPrincipal = getDocumentoConsecutivo(factura, '');

  return {
    title: FACTURA_DETALLE_LABELS.header.title,
    subtitle: documentoPrincipal ? `Factura #${documentoPrincipal}` : FACTURA_DETALLE_LABELS.header.subtitle,
    backTo: '/facturas',
    backLabel: FACTURA_DETALLE_LABELS.header.back
  };
};
