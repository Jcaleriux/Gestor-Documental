export const buildCentroCostoLineScope = (line) => (
  `${String(line?.centro_costo_id || '')}::${String(line?.codigo || '')}::${String(line?.nombre || '')}`
);
