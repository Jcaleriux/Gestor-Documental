import { useParams } from 'react-router-dom';
import { useFacturaDetalle } from '../hooks/useFacturaDetalle';
import LoadingState from './common/LoadingState';
import { LOADING_LABELS } from '../utils/uiLabels';
import FacturaDetalleLayout from './facturaDetalle/FacturaDetalleLayout';
import { buildFacturaDetallePageState } from './facturaDetalle/viewModels/buildFacturaDetallePageState.js';
import { buildFacturaDetalleHeaderViewModel } from './facturaDetalle/viewModels/buildFacturaDetalleHeaderViewModel.js';
import { buildFacturaDetalleLayoutProps } from './facturaDetalle/viewModels/buildFacturaDetalleLayoutProps.js';

function FacturaDetalle({ sociedadId }) {
  const { id } = useParams();
  const detalle = useFacturaDetalle({ id, sociedadId });
  const pageState = buildFacturaDetallePageState({ sociedadId, meta: detalle.meta });

  if (pageState.status === 'loading') {
    return <LoadingState label={LOADING_LABELS.facturaDetalle} />;
  }

  if (pageState.status !== 'ready') {
    return <p>{pageState.message}</p>;
  }

  const viewModels = detalle.viewModels;
  const headerViewModel = buildFacturaDetalleHeaderViewModel({ factura: detalle.meta.factura });
  const layoutProps = buildFacturaDetalleLayoutProps({ headerViewModel, viewModels });

  return <FacturaDetalleLayout layoutProps={layoutProps} />;
}

export default FacturaDetalle;
