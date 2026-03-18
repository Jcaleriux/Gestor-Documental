import { useParams, useSearchParams } from 'react-router-dom';
import { useFacturaDetalle } from '../hooks/useFacturaDetalle';
import LoadingState from './common/LoadingState';
import { LOADING_LABELS } from '../utils/uiLabels';
import FacturaDetalleLayout from './facturaDetalle/FacturaDetalleLayout';
import { buildFacturaDetallePageState } from './facturaDetalle/viewModels/buildFacturaDetallePageState.js';
import { buildFacturaDetalleHeaderViewModel } from './facturaDetalle/viewModels/buildFacturaDetalleHeaderViewModel.js';
import { buildFacturaDetalleLayoutProps } from './facturaDetalle/viewModels/buildFacturaDetalleLayoutProps.js';

function FacturaDetalle({ sociedadId, selectedSociedadName = '', canEditContabilizacion = false }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isReadOnlyMode = searchParams.get('readonly') === '1';
  const canEditCurrentView = canEditContabilizacion && !isReadOnlyMode;
  const detalle = useFacturaDetalle({
    id,
    sociedadId,
    selectedSociedadName,
    canEditContabilizacion: canEditCurrentView
  });
  const pageState = buildFacturaDetallePageState({ sociedadId, meta: detalle.meta });

  if (pageState.status === 'loading') {
    return <LoadingState label={LOADING_LABELS.facturaDetalle} />;
  }

  if (pageState.status !== 'ready') {
    return <p>{pageState.message}</p>;
  }

  const viewModels = detalle.viewModels;
  const headerViewModel = buildFacturaDetalleHeaderViewModel({
    factura: detalle.meta.factura,
    canEditContabilizacion: canEditCurrentView,
  });
  const layoutProps = buildFacturaDetalleLayoutProps({ headerViewModel, viewModels });

  return <FacturaDetalleLayout layoutProps={layoutProps} />;
}

export default FacturaDetalle;
