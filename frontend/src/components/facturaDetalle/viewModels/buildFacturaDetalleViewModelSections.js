import { buildMonedaFactura } from './viewModelUtils.js';
import { buildPdfViewModel } from './buildPdfViewModel.js';
import { buildContaViewModel } from './buildContaViewModel.js';
import { buildEstadoComentariosViewModels } from './buildEstadoComentariosViewModels.js';

export const buildSummarySectionViewModel = ({ factura, detalle = {} }) => ({
  factura,
  monedaFactura: buildMonedaFactura(factura),
  selectedSociedadName: detalle.selectedSociedadName || '',
  canEditContabilizacion: Boolean(detalle.canEditContabilizacion)
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
