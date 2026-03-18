const ACCESO_TOTAL = 'acceso_total';
const DOCUMENTOS_VER = 'documentos_ver';
const DOCUMENTOS_TRAMITAR_PAGO = 'documentos_tramitar_pago';
const DOCUMENTOS_APROBAR_GERENCIA = 'documentos_aprobar_gerencia';
const DOCUMENTOS_APROBAR_GERENCIA_CONTABLE = 'documentos_aprobar_gerencia_contable';
const DOCUMENTOS_APROBAR_GERENCIA_FINANCIERA = 'documentos_aprobar_gerencia_financiera';

const hasPermission = (userPermissions = [], permission) => {
  const normalizedPermissions = Array.isArray(userPermissions)
    ? userPermissions.map((item) => String(item || '').trim())
    : [];

  return normalizedPermissions.includes(ACCESO_TOTAL)
    || normalizedPermissions.includes(permission);
};

function getPermisosTramite({ userPermissions, estado }) {
  const enEtapaGerencia = estado === 'en_aprobacion_gerencia';
  const enEtapaGerenciaContable = estado === 'en_aprobacion_gerencia_contable';
  const enEtapaFinanciera = estado === 'en_aprobacion_gerencia_financiera';
  const esRevisionTesoreria =
    estado === 'en_revision_tesoreria' ||
    estado === 'en_revision_tesoreria_1' ||
    estado === 'en_revision_tesoreria_2';

  const puedeVerGerencia =
    enEtapaGerencia
    && hasPermission(userPermissions, DOCUMENTOS_VER);
  const puedeGerencia =
    enEtapaGerencia
    && hasPermission(userPermissions, DOCUMENTOS_APROBAR_GERENCIA);
  const puedeGerenciaContable =
    enEtapaGerenciaContable
    && hasPermission(userPermissions, DOCUMENTOS_APROBAR_GERENCIA_CONTABLE);
  const puedeFinanciera =
    enEtapaFinanciera
    && hasPermission(userPermissions, DOCUMENTOS_APROBAR_GERENCIA_FINANCIERA);
  const puedeTesoreria =
    esRevisionTesoreria
    && hasPermission(userPermissions, DOCUMENTOS_TRAMITAR_PAGO);
  const puedeMarcarPagado =
    estado === 'en_revision_tesoreria_2'
    && hasPermission(userPermissions, DOCUMENTOS_TRAMITAR_PAGO);

  return {
    enEtapaGerencia,
    enEtapaGerenciaContable,
    enEtapaFinanciera,
    esRevisionTesoreria,
    puedeVerGerencia,
    puedeGerencia,
    puedeGerenciaContable,
    puedeFinanciera,
    puedeTesoreria,
    puedeAccionSiguiente: puedeFinanciera || puedeMarcarPagado
  };
}

export default getPermisosTramite;
