import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import FacturaDetalleSummaryCard from './FacturaDetalleSummaryCard';
import FacturaDetallePdfSection from './FacturaDetallePdfSection';
import FacturaDetalleContabilizacionSection from './FacturaDetalleContabilizacionSection';
import FacturaDetalleEstadoSection from './FacturaDetalleEstadoSection';
import FacturaDetalleHistorialSection from './FacturaDetalleHistorialSection';
import FacturaDetalleComentariosSection from './FacturaDetalleComentariosSection';

function FacturaDetalleLayout({ layoutProps }) {
  const {
    header,
    leftColumn,
    rightColumn
  } = layoutProps;

  return (
    <div className="container-fluid">
      <PageHeader
        title={header.title}
        subtitle={header.subtitle}
        actions={(
          <Link className="btn btn-light" to={header.backTo}>
            {header.backLabel}
          </Link>
        )}
      />

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <FacturaDetalleSummaryCard viewModel={leftColumn.summary} />

          <FacturaDetallePdfSection viewModel={leftColumn.pdf} />
        </div>

        <div className="col-12 col-lg-5">
          <FacturaDetalleContabilizacionSection viewModel={rightColumn.contabilizacion} />

          <FacturaDetalleEstadoSection viewModel={rightColumn.estado} />

          <FacturaDetalleHistorialSection viewModel={rightColumn.historial} />

          <FacturaDetalleComentariosSection viewModel={rightColumn.comentarios} />
        </div>
      </div>
    </div>
  );
}

export default FacturaDetalleLayout;
