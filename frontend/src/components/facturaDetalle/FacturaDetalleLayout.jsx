import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import FacturaDetalleSummaryCard from './FacturaDetalleSummaryCard';
import FacturaDetallePdfSection from './FacturaDetallePdfSection';
import FacturaDetalleContabilizacionSection from './FacturaDetalleContabilizacionSection';
import FacturaDetalleHistorialSection from './FacturaDetalleHistorialSection';
import FacturaDetalleComentariosSection from './FacturaDetalleComentariosSection';

function FacturaDetalleLayout({ layoutProps }) {
  const {
    header,
    summary,
    leftColumn,
    rightColumn
  } = layoutProps;

  return (
    <div className="container-fluid">
      <PageHeader
        title={header.title}
        actions={(
          <Link className="btn btn-light" to={header.backTo}>
            {header.backLabel}
          </Link>
        )}
      />

      <FacturaDetalleSummaryCard viewModel={summary} />

      <div className="row g-3 factura-detalle-grid">
        <div className="col-12 col-lg-5 col-xl-4">
          <div className="factura-conta-sticky">
            <FacturaDetalleContabilizacionSection viewModel={leftColumn.contabilizacion} />
          </div>
        </div>

        <div className="col-12 col-lg-7 col-xl-8">
          <FacturaDetallePdfSection viewModel={rightColumn.pdf} />

          <FacturaDetalleHistorialSection viewModel={rightColumn.historial} />

          <FacturaDetalleComentariosSection viewModel={rightColumn.comentarios} />
        </div>
      </div>
    </div>
  );
}

export default FacturaDetalleLayout;
