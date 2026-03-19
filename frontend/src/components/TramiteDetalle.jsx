import { LOADING_LABELS } from '../utils/uiLabels.js';
import LoadingState from './common/LoadingState.jsx';
import TramiteDetalleLayout from './tramiteDetalle/TramiteDetalleLayout.jsx';
import { useTramiteDetallePage } from '../hooks/tramiteDetalle/useTramiteDetallePage.js';

function TramiteDetalle({ sociedadId, authUser = null, userPermissions = [] }) {
  const {
    pageState,
    layoutProps,
  } = useTramiteDetallePage({
    sociedadId,
    authUser,
    userPermissions,
  });

  if (pageState.status === 'loading') {
    return <LoadingState label={LOADING_LABELS.tramiteDetalle} />;
  }

  if (pageState.status !== 'ready') {
    return <p>{pageState.message}</p>;
  }

  return <TramiteDetalleLayout layoutProps={layoutProps} />;
}

export default TramiteDetalle;
