const NEXT_STATE_CONFIG = {
  en_aprobacion_gerencia: { label: 'Enviar a gerencia contable', estado: 'en_aprobacion_gerencia_contable' },
  en_aprobacion_gerencia_contable: { label: 'Enviar a gerencia financiera', estado: 'en_aprobacion_gerencia_financiera' },
  en_aprobacion_gerencia_financiera: { label: 'Enviar a tesoreria para pago', estado: 'en_revision_tesoreria_2' },
  en_revision_tesoreria_2: { label: 'Marcar pagado', estado: 'pagado' }
};

function getNextStateConfig(estado) {
  return NEXT_STATE_CONFIG[estado];
}

export { getNextStateConfig };
