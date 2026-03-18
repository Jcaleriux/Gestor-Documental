export const estadoLabelNotaCredito = (estado) => {
  switch (String(estado || '').toLowerCase()) {
    case 'aplicada':
      return 'Aplicada';
    case 'disponible':
    default:
      return 'Disponible';
  }
};

export const estadoClassNotaCredito = (estado) => {
  switch (String(estado || '').toLowerCase()) {
    case 'aplicada':
      return 'badge-soft-secondary';
    case 'disponible':
    default:
      return 'badge-soft-success';
  }
};
