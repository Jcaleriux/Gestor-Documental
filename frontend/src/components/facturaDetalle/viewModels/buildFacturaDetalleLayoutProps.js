export const buildFacturaDetalleHeaderLayoutProps = ({ headerViewModel }) => ({
  ...headerViewModel
});

export const buildFacturaDetalleSummaryLayoutProps = ({ viewModels }) => viewModels.summary;

export const buildFacturaDetalleLeftColumnLayoutProps = ({ viewModels }) => ({
  contabilizacion: viewModels.contabilizacion,
});

export const buildFacturaDetalleRightColumnLayoutProps = ({ viewModels }) => ({
  pdf: viewModels.pdf,
  historial: viewModels.historial,
  comentarios: viewModels.comentarios
});

export const buildFacturaDetalleLayoutProps = (input) => ({
  header: buildFacturaDetalleHeaderLayoutProps(input),
  summary: buildFacturaDetalleSummaryLayoutProps(input),
  leftColumn: buildFacturaDetalleLeftColumnLayoutProps(input),
  rightColumn: buildFacturaDetalleRightColumnLayoutProps(input)
});
