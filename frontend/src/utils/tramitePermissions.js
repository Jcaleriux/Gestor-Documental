function getPermisosTramite({ rolActivo, estado }) {
  const esRevisionTesoreria =
    estado === 'en_revision_tesoreria' ||
    estado === 'en_revision_tesoreria_1' ||
    estado === 'en_revision_tesoreria_2';

  return {
    esRevisionTesoreria,
    puedeGerencia: rolActivo === 'gerencia' && estado === 'en_aprobacion_gerencia',
    puedeGerenciaContable: rolActivo === 'gerencia_contable' && estado === 'en_aprobacion_gerencia_contable',
    puedeFinanciera: rolActivo === 'financiera' && estado === 'en_aprobacion_gerencia_financiera',
    puedeTesoreria: rolActivo === 'tesoreria' && esRevisionTesoreria
  };
}

export default getPermisosTramite;
