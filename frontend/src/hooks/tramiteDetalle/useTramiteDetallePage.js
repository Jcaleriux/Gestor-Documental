import { useParams } from 'react-router-dom';
import { useTramiteDetalle } from '../useTramiteDetalle.js';
import useTramiteResumen from '../useTramiteResumen.js';
import { useTramiteWorkflowActions } from './useTramiteWorkflowActions.js';
import {
  buildTramiteWorkflowInputs,
  buildTramiteDetallePageViewModel,
} from '../../components/tramiteDetalle/viewModels/buildTramiteDetallePageViewModel.js';

export const useTramiteDetallePage = ({
  sociedadId,
  authUser = null,
  userPermissions = [],
  dependencies = {},
} = {}) => {
  const {
    useParamsHook = useParams,
    useDetalleHook = useTramiteDetalle,
    useResumenHook = useTramiteResumen,
    useWorkflowActionsHook = useTramiteWorkflowActions,
  } = dependencies;

  const { id } = useParamsHook();
  const detalle = useDetalleHook({ id, sociedadId });
  const {
    documentosActivos,
    retencionesActivas,
    resumenTotales,
    resumenMoneda,
  } = useResumenHook(detalle.documentos, detalle.retenciones);

  const workflowInputs = buildTramiteWorkflowInputs({
    id,
    tramite: detalle.tramite,
    documentosActivos,
    authUser,
    fetchDetalle: detalle.fetchDetalle,
    fetchHistorial: detalle.fetchHistorial,
    setActionMessage: detalle.setActionMessage,
    setActionError: detalle.setActionError,
  });

  const workflow = useWorkflowActionsHook({ workflowInputs });

  return buildTramiteDetallePageViewModel({
    id,
    sociedadId,
    detalle,
    documentosActivos,
    retencionesActivas,
    resumenTotales,
    resumenMoneda,
    workflow,
    userPermissions,
  });
};
