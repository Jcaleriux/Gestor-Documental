import { buildFacturaDetalleViewModels } from '../../components/facturaDetalle/viewModels/buildFacturaDetalleViewModels.js';

export const buildFacturaDetalleViewModelOutput = ({ id, detalleOutput }) => (
  buildFacturaDetalleViewModels({
    id,
    factura: detalleOutput.factura,
    detalle: detalleOutput
  })
);
