const DASHBOARD_PROFILES = Object.freeze({
  ADMIN: 'admin',
  TESORERIA: 'tesoreria',
  CONTABILIDAD: 'contabilidad',
  GERENCIA: 'gerencia',
  ASISTENTE: 'asistente',
  CONSULTA: 'consulta',
  GENERAL: 'general'
});

const WORKFLOW_PERMISSIONS = Object.freeze([
  'documentos_contabilizar',
  'documentos_tramitar_pago',
  'documentos_aprobar_gerencia',
  'documentos_aprobar_gerencia_contable',
  'documentos_aprobar_gerencia_financiera',
  'documentos_firmar_autorizar',
  'documentos_marcar_pagado'
]);

const APPROVAL_PERMISSIONS = Object.freeze([
  'documentos_aprobar_gerencia',
  'documentos_aprobar_gerencia_contable',
  'documentos_aprobar_gerencia_financiera',
  'documentos_firmar_autorizar'
]);

const normalizePermissionList = (permissions) => (
  Array.isArray(permissions)
    ? [...new Set(permissions.filter(Boolean).map((permission) => String(permission).trim()))]
    : []
);

const hasAnyPermission = (permissions, requiredPermissions) => (
  normalizePermissionList(requiredPermissions).some((permission) => permissions.includes(permission))
);

const isAssistantRole = (roleCode) => (
  roleCode.endsWith('_asistente') || roleCode.endsWith('_auxiliar')
);

const isConsultationRole = (roleCode) => (
  roleCode === 'asistencia' || roleCode === 'consulta' || roleCode === 'solo_consulta'
);

const getDashboardProfile = ({ roleCode, permissions } = {}) => {
  const normalizedRoleCode = String(roleCode || '').trim().toLowerCase();
  const permissionList = normalizePermissionList(permissions);
  const hasWorkflowAccess = hasAnyPermission(permissionList, WORKFLOW_PERMISSIONS);

  if (permissionList.includes('acceso_total') || normalizedRoleCode === 'admin') {
    return DASHBOARD_PROFILES.ADMIN;
  }

  if (isConsultationRole(normalizedRoleCode)) {
    return DASHBOARD_PROFILES.CONSULTA;
  }

  if (isAssistantRole(normalizedRoleCode)) {
    return DASHBOARD_PROFILES.ASISTENTE;
  }

  if (
    normalizedRoleCode.startsWith('tesoreria_')
    || hasAnyPermission(permissionList, ['documentos_tramitar_pago', 'documentos_marcar_pagado'])
  ) {
    return DASHBOARD_PROFILES.TESORERIA;
  }

  if (
    normalizedRoleCode.startsWith('contabilidad_')
    || permissionList.includes('documentos_contabilizar')
  ) {
    return DASHBOARD_PROFILES.CONTABILIDAD;
  }

  if (
    normalizedRoleCode.startsWith('gerencia_')
    || hasAnyPermission(permissionList, APPROVAL_PERMISSIONS)
  ) {
    return DASHBOARD_PROFILES.GERENCIA;
  }

  if (!hasWorkflowAccess) {
    return DASHBOARD_PROFILES.CONSULTA;
  }

  return DASHBOARD_PROFILES.GENERAL;
};

const DASHBOARD_PROFILE_COPY = Object.freeze({
  [DASHBOARD_PROFILES.ADMIN]: {
    eyebrow: 'Vista administrativa',
    subtitle: 'Supervisa sociedades, volumen, alertas y cuellos de botella del flujo completo.',
    focusTitle: 'Radar operativo',
    modeTitle: 'Alcance del rol',
    modeDescription: 'Usa este panel para detectar desviaciones, reasignar seguimiento y validar salud operativa.'
  },
  [DASHBOARD_PROFILES.TESORERIA]: {
    eyebrow: 'Vista de tesoreria',
    subtitle: 'Prioriza vencimientos, pagos proximos y proveedores con mayor exposicion por moneda.',
    focusTitle: 'Prioridades de pago',
    modeTitle: 'Modo de trabajo',
    modeDescription: 'Este panel resalta riesgo de pago, vencimientos y exposicion financiera sin mezclar divisas.'
  },
  [DASHBOARD_PROFILES.CONTABILIDAD]: {
    eyebrow: 'Vista de contabilidad',
    subtitle: 'Enfoca la cola de contabilizacion, validaciones y documentos que requieren completar metadatos.',
    focusTitle: 'Cola contable',
    modeTitle: 'Modo de trabajo',
    modeDescription: 'Ideal para cerrar pendientes de contabilizacion, revisar errores y preparar documentos para el siguiente paso.'
  },
  [DASHBOARD_PROFILES.GERENCIA]: {
    eyebrow: 'Vista gerencial',
    subtitle: 'Resume la carga operativa y la exposicion para revisar aprobaciones y excepciones.',
    focusTitle: 'Puntos de decision',
    modeTitle: 'Modo de trabajo',
    modeDescription: 'Pensado para seguimiento ejecutivo y validacion rapida de prioridades antes de aprobar.'
  },
  [DASHBOARD_PROFILES.ASISTENTE]: {
    eyebrow: 'Vista auxiliar',
    subtitle: 'Ordena el trabajo de apoyo operativo y da contexto rapido para actuar sobre pendientes del dia.',
    focusTitle: 'Trabajo del dia',
    modeTitle: 'Modo de trabajo',
    modeDescription: 'Pensado para asistentes y auxiliares que apoyan la operacion con seguimiento, validacion y preparacion.'
  },
  [DASHBOARD_PROFILES.CONSULTA]: {
    eyebrow: 'Vista de consulta',
    subtitle: 'Facilita seguimiento seguro de documentos, actividad reciente y estado general sin pasos criticos.',
    focusTitle: 'Que revisar hoy',
    modeTitle: 'Modo consulta',
    modeDescription: 'Ideal para asistencia y perfiles de consulta que necesitan visibilidad del sistema sin ejecutar cambios sensibles.'
  },
  [DASHBOARD_PROFILES.GENERAL]: {
    eyebrow: 'Vista general',
    subtitle: 'Resumen operativo del sistema con foco en pendientes, actividad reciente y exposicion por moneda.',
    focusTitle: 'Resumen del rol',
    modeTitle: 'Modo de trabajo',
    modeDescription: 'Panel general para seguimiento rapido del estado actual del sistema.'
  }
});

const getDashboardProfileCopy = (profile) => (
  DASHBOARD_PROFILE_COPY[profile] || DASHBOARD_PROFILE_COPY[DASHBOARD_PROFILES.GENERAL]
);

export {
  DASHBOARD_PROFILES,
  getDashboardProfile,
  getDashboardProfileCopy
};
