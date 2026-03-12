import { buildContabilizacionTotals } from './viewModelUtils.js';
import {
  buildContaAssociationsViewModel,
  buildContaFormViewModel,
  buildContaModalsViewModel,
  buildContaRetencionViewModel
} from './buildContaSubViewModels.js';

export const buildContaTotalsViewModel = ({ factura, detalle }) => (
  buildContabilizacionTotals({ factura, conta: detalle.conta })
);

export const buildContaMainSectionsViewModel = ({ detalle }) => ({
  form: buildContaFormViewModel({ detalle }),
  associations: buildContaAssociationsViewModel({ detalle }),
  modals: buildContaModalsViewModel({ detalle })
});

export const buildContaRetencionSectionViewModel = ({ detalle, totals }) => (
  buildContaRetencionViewModel({ detalle, totals })
);

export const buildContaViewModel = ({ factura, detalle }) => {
  const totals = buildContaTotalsViewModel({ factura, detalle });

  return {
    ...buildContaMainSectionsViewModel({ detalle }),
    retencion: buildContaRetencionSectionViewModel({ detalle, totals }),
    totals
  };
};
