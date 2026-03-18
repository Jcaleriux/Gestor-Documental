import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_PROFILES,
  getDashboardProfile,
  getDashboardProfileCopy
} from '../../src/utils/dashboardProfiles.js';

test('getDashboardProfile clasifica admin por acceso_total', () => {
  const profile = getDashboardProfile({
    roleCode: 'personalizado',
    permissions: ['documentos_ver', 'acceso_total']
  });

  assert.equal(profile, DASHBOARD_PROFILES.ADMIN);
});

test('getDashboardProfile clasifica auxiliares operativos como asistente', () => {
  assert.equal(
    getDashboardProfile({
      roleCode: 'contabilidad_asistente',
      permissions: ['documentos_ver', 'documentos_contabilizar']
    }),
    DASHBOARD_PROFILES.ASISTENTE
  );

  assert.equal(
    getDashboardProfile({
      roleCode: 'tesoreria_auxiliar',
      permissions: ['documentos_ver', 'documentos_tramitar_pago']
    }),
    DASHBOARD_PROFILES.ASISTENTE
  );
});

test('getDashboardProfile clasifica asistencia y perfiles sin workflow como consulta', () => {
  assert.equal(
    getDashboardProfile({
      roleCode: 'asistencia',
      permissions: ['documentos_ver']
    }),
    DASHBOARD_PROFILES.CONSULTA
  );

  assert.equal(
    getDashboardProfile({
      roleCode: 'personalizado',
      permissions: ['documentos_ver']
    }),
    DASHBOARD_PROFILES.CONSULTA
  );
});

test('getDashboardProfileCopy expone copy para modo consulta', () => {
  const copy = getDashboardProfileCopy(DASHBOARD_PROFILES.CONSULTA);
  assert.equal(copy.modeTitle, 'Modo consulta');
  assert.match(copy.modeDescription, /consulta/i);
});
