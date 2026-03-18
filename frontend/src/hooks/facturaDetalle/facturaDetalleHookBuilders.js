import { buildFacturaDetalleActionModuleInputs } from './facturaDetalleActionInputsBuilders.js';
import {
  buildFacturaDetalleOutputContract,
  buildFacturaDetalleViewModelInput
} from './facturaDetalleOutputBuilders.js';
import { buildFacturaDetalleViewModelOutput } from './facturaDetalleViewModelBuilder.js';

export const buildFacturaDetalleActionsParams = ({
  id,
  data,
  actionDependencies
}) => ({
  moduleInputs: buildFacturaDetalleActionModuleInputs({ id, data }),
  dependencies: actionDependencies
});

export const buildFacturaDetalleHookOutput = ({
  id,
  data,
  actions,
  selectedSociedadName,
  canEditContabilizacion
}) => {
  const outputContract = buildFacturaDetalleOutputContract({
    data,
    actions,
    selectedSociedadName,
    canEditContabilizacion
  });
  const viewModelInput = buildFacturaDetalleViewModelInput(outputContract);

  return {
    ...outputContract,
    viewModels: outputContract.meta.factura
      ? buildFacturaDetalleViewModelOutput({ id, detalleOutput: viewModelInput })
      : null
  };
};
