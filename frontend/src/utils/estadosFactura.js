export const estadoLabelFactura = (estado) => {
  if (!estado) return 'No definido';

  switch (estado) {
    case 'no_contabilizado':
      return 'No contabilizado';
    case 'en_revision':
      return 'En revision contable';
    case 'en_tramite_pago':
      return 'En tramite de pago';
    case 'pagado_parcialmente':
      return 'Pagado parcialmente';
    default:
      return estado.replace(/_/g, ' ');
  }
};

export const estadoClassFactura = (estado) => {
  switch (estado) {
    case 'contabilizado':
      return 'badge-soft-success';
    case 'en_revision':
      return 'badge-soft-warning';
    case 'rechazado':
      return 'badge-soft-danger';
    case 'en_tramite_pago':
      return 'badge-soft-info';
    case 'en_aprobacion':
      return 'badge-soft-primary';
    case 'pagado':
      return 'badge-soft-dark';
    case 'pagado_parcialmente':
      return 'badge-soft-warning';
    case 'no_contabilizado':
    default:
      return 'badge-soft-secondary';
  }
};
