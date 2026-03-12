import {
  buildSummarySectionViewModel,
  buildPdfSectionViewModel,
  buildContabilizacionSectionViewModel,
  buildEstadoComentariosSectionViewModels
} from './buildFacturaDetalleViewModelSections.js';

export const buildFacturaDetalleViewModels = ({ id, factura, detalle }) => ({
  summary: buildSummarySectionViewModel({ factura }),
  pdf: buildPdfSectionViewModel({ id, factura, detalle }),
  contabilizacion: buildContabilizacionSectionViewModel({ factura, detalle }),
  ...buildEstadoComentariosSectionViewModels({ detalle })
});
