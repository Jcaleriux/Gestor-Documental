export const getTramiteSemaforoStatus = (tramite) => {
  const total = Number(tramite.total_documentos || 0);
  if (!total) return 'sin_datos';

  const estado = tramite.estado;
  let aprobados = 0;

  if (estado === 'en_aprobacion_gerencia') {
    aprobados = Number(tramite.aprobados_gerencia || 0);
  } else if (estado === 'en_aprobacion_gerencia_contable') {
    aprobados = Number(tramite.aprobados_gerencia_contable || 0);
  } else if (estado === 'en_aprobacion_gerencia_financiera') {
    aprobados = Number(tramite.aprobados_financiero || 0);
  } else if (
    estado === 'en_revision_tesoreria'
    || estado === 'en_revision_tesoreria_1'
    || estado === 'en_revision_tesoreria_2'
  ) {
    const finDecisiones = Number(tramite.aprobados_financiero || 0) + Number(tramite.rechazados_financiero || 0);
    const contDecisiones = Number(tramite.aprobados_gerencia_contable || 0) + Number(tramite.rechazados_gerencia_contable || 0);

    if (finDecisiones > 0) {
      aprobados = Number(tramite.aprobados_financiero || 0);
    } else if (contDecisiones > 0) {
      aprobados = Number(tramite.aprobados_gerencia_contable || 0);
    } else {
      aprobados = Number(tramite.aprobados_gerencia || 0);
    }
  } else if (estado === 'pagado') {
    return 'verde';
  }

  if (aprobados === 0) return 'rojo';
  if (aprobados < total) return 'amarillo';
  return 'verde';
};

export const getTramiteSemaforoLabel = (status) => {
  if (status === 'verde') return 'Aprobado';
  if (status === 'amarillo') return 'Parcial';
  if (status === 'rojo') return 'No aprobado';
  return 'Sin datos';
};

export const getTramiteSemaforoClass = (status) => {
  if (status === 'verde') return 'badge-soft-success';
  if (status === 'amarillo') return 'badge-soft-warning';
  if (status === 'rojo') return 'badge-soft-danger';
  return 'badge-soft-secondary';
};
