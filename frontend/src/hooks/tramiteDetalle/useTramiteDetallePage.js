import { useParams } from 'react-router-dom';
import { useTramiteDetalle } from '../useTramiteDetalle.js';
import useTramiteResumen from '../useTramiteResumen.js';
import { useTramiteWorkflowActions } from './useTramiteWorkflowActions.js';
import { useTramiteReport } from './useTramiteReport.js';
import {
  buildTramiteWorkflowInputs,
  buildSociedadLabel,
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
    useReportHook = useTramiteReport,
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
  const sociedadLabel = buildSociedadLabel({
    sociedadInfo: detalle.sociedadInfo,
    sociedadId,
  });
  const report = useReportHook({
    tramite: detalle.tramite,
    documentos: documentosActivos,
    providerGroups: detalle.providerGroups,
    providerSortDirection: workflow.providerSortDirection,
    sociedadId,
    sociedadLabel,
  });

  return buildTramiteDetallePageViewModel({
    id,
    sociedadId,
    detalle,
    documentosActivos,
    retencionesActivas,
    resumenTotales,
    resumenMoneda,
    workflow,
    report,
    userPermissions,
    sociedadLabel,
  });
};
