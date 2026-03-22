export const estadoLabelTramite = (estado) => {
  if (!estado) return 'Sin estado';
  const map = {
    en_aprobacion_gerencia: 'En aprobacion gerencia',
    en_aprobacion_gerencia_contable: 'En aprobacion gerencia contable',
    en_aprobacion_gerencia_financiera: 'En aprobacion gerencia financiera',
    en_revision_tesoreria: 'En revision tesoreria',
    en_revision_tesoreria_1: 'En revision tesoreria inicial',
    en_revision_tesoreria_2: 'En tesoreria para pago',
    pagado: 'Pagado',
    cancelado: 'Cancelado'
  };
  return map[estado] || estado.replace(/_/g, ' ');
};

export const estadoClassTramite = (estado) => {
  switch (estado) {
    case 'contabilizado':
    case 'pagado':
      return 'badge-soft-success';
    case 'en_aprobacion_gerencia':
    case 'en_aprobacion_gerencia_contable':
    case 'en_aprobacion_gerencia_financiera':
      return 'badge-soft-primary';
    case 'en_revision_tesoreria':
    case 'en_revision_tesoreria_1':
    case 'en_revision_tesoreria_2':
    case 'en_revision':
      return 'badge-soft-warning';
    case 'en_tramite_pago':
      return 'badge-soft-info';
    case 'pagado_parcialmente':
      return 'badge-soft-warning';
    case 'rechazado':
    case 'cancelado':
      return 'badge-soft-danger';
    default:
      return 'badge-soft-secondary';
  }
};

export const decisionLabel = (valor) => {
  if (!valor) return 'Pendiente';
  if (valor === 'aprobado') return 'Aprobado';
  if (valor === 'rechazado') return 'Rechazado';
  return valor;
};

export const decisionClass = (valor) => {
  if (valor === 'aprobado') return 'badge-soft-success';
  if (valor === 'rechazado') return 'badge-soft-danger';
  return 'badge-soft-secondary';
};

export const tesoreriaLabel = (valor) => {
  if (!valor || valor === 'pendiente') return 'Pendiente';
  if (valor === 'pagado') return 'Pagado';
  if (valor === 'excluido' || valor === 'rechazado') return 'Excluido';
  if (valor === 'devuelto_contabilidad') return 'Devuelto a contabilidad';
  if (valor === 'reenviado') return 'Reenviado';
  if (valor === 'reincluido') return 'Reincluido';
  return valor;
};

export const tesoreriaClass = (valor) => {
  if (!valor || valor === 'pendiente') return 'badge-soft-warning';
  if (valor === 'pagado') return 'badge-soft-success';
  if (valor === 'excluido' || valor === 'rechazado') return 'badge-soft-danger';
  if (valor === 'devuelto_contabilidad') return 'badge-soft-danger';
  if (valor === 'reenviado' || valor === 'reincluido') return 'badge-soft-primary';
  return 'badge-soft-secondary';
};
