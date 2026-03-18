const ESTADOS_TRAMITE = [
  'en_aprobacion_gerencia',
  'en_aprobacion_gerencia_contable',
  'en_aprobacion_gerencia_financiera',
  'en_revision_tesoreria',
  'en_revision_tesoreria_2',
  'pagado',
  'cancelado'
];

const ROLES_ADMIN = [
  { value: 'gerencia', label: 'Gerencia' },
  { value: 'gerencia_contable', label: 'G. Contable' },
  { value: 'financiera', label: 'Financiera' },
  { value: 'tesoreria', label: 'Tesoreria' }
];

const DESTINOS_TESORERIA = [
  { value: 'en_aprobacion_gerencia', label: 'Gerencia' },
  { value: 'en_aprobacion_gerencia_contable', label: 'G. Contable' },
  { value: 'en_aprobacion_gerencia_financiera', label: 'Financiera' }
];

const ROLE_BY_ESTADO = {
  en_aprobacion_gerencia: 'gerencia',
  en_aprobacion_gerencia_contable: 'gerencia_contable',
  en_aprobacion_gerencia_financiera: 'financiera',
  en_revision_tesoreria: 'tesoreria',
  en_revision_tesoreria_1: 'tesoreria',
  en_revision_tesoreria_2: 'tesoreria'
};

function getRoleByEstado(estado) {
  return ROLE_BY_ESTADO[estado];
}

export {
  ESTADOS_TRAMITE,
  ROLES_ADMIN,
  DESTINOS_TESORERIA,
  getRoleByEstado
};
