import { useFacturaDetalleData } from './facturaDetalle/useFacturaDetalleData.js';
import { useFacturaDetalleActions } from './facturaDetalle/useFacturaDetalleActions.js';
import {
  buildFacturaDetalleActionsParams,
  buildFacturaDetalleHookOutput
} from './facturaDetalle/facturaDetalleHookBuilders.js';

export const useFacturaDetalle = ({ id, sociedadId, dataDependencies, actionDependencies }) => {
  const data = useFacturaDetalleData({ id, sociedadId, dependencies: dataDependencies });
  const actions = useFacturaDetalleActions(buildFacturaDetalleActionsParams({
    id,
    data,
    actionDependencies
  }));

  return buildFacturaDetalleHookOutput({
    id,
    data,
    actions
  });
};
