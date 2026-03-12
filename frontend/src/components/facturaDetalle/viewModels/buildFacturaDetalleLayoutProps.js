export const buildFacturaDetalleHeaderLayoutProps = ({ headerViewModel }) => ({
  ...headerViewModel
});

export const buildFacturaDetalleLeftColumnLayoutProps = ({ viewModels }) => ({
  summary: viewModels.summary,
  pdf: viewModels.pdf
});

export const buildFacturaDetalleRightColumnLayoutProps = ({ viewModels }) => ({
  contabilizacion: viewModels.contabilizacion,
  estado: viewModels.estado,
  historial: viewModels.historial,
  comentarios: viewModels.comentarios
});

export const buildFacturaDetalleLayoutProps = (input) => ({
  header: buildFacturaDetalleHeaderLayoutProps(input),
  leftColumn: buildFacturaDetalleLeftColumnLayoutProps(input),
  rightColumn: buildFacturaDetalleRightColumnLayoutProps(input)
});
