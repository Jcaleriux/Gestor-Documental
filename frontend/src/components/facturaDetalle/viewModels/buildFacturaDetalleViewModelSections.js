import { buildMonedaFactura } from './viewModelUtils.js';
import { buildPdfViewModel } from './buildPdfViewModel.js';
import { buildContaViewModel } from './buildContaViewModel.js';
import { buildEstadoComentariosViewModels } from './buildEstadoComentariosViewModels.js';

export const buildSummarySectionViewModel = ({ factura }) => ({
  factura,
  monedaFactura: buildMonedaFactura(factura)
});

export const buildPdfSectionViewModel = ({ id, factura, detalle }) => (
  buildPdfViewModel({ id, factura, detalle })
);

export const buildContabilizacionSectionViewModel = ({ factura, detalle }) => (
  buildContaViewModel({ factura, detalle })
);

export const buildEstadoComentariosSectionViewModels = ({ detalle }) => (
  buildEstadoComentariosViewModels({ detalle })
);
