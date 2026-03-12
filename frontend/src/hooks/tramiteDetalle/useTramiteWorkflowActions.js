import { createTramiteWorkflowHandlers } from './createTramiteWorkflowHandlers.js';
import { useTramiteWorkflowState } from './useTramiteWorkflowState.js';
import {
  normalizeTramiteWorkflowInputs,
  buildTramiteWorkflowStateInputs,
  buildTramiteWorkflowActionsOutput
} from './tramiteWorkflowActionBuilders.js';

export const useTramiteWorkflowActions = ({
  workflowInputs,
  dependencies = {},
  ...legacyInputs
}) => {
  const normalizedInputs = normalizeTramiteWorkflowInputs({
    workflowInputs,
    ...legacyInputs
  });

  const workflowState = useTramiteWorkflowState(
    buildTramiteWorkflowStateInputs(normalizedInputs)
  );

  const handlers = createTramiteWorkflowHandlers({
    workflowInputs: normalizedInputs,
    workflowState,
    dependencies
  });

  return buildTramiteWorkflowActionsOutput({
    workflowState,
    handlers
  });
};
