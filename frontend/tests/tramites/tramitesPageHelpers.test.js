import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTramitesSearch,
  buildTramitesRoute,
  getTramitesReturnActionLabel,
  parseTramitesEstadoFromSearch,
  parseTramitesReturnContextFromSearch,
} from '../../src/components/tramites/tramitesPageHelpers.js';

test('tramitesPageHelpers interpreta estado y retorno seguro desde search params', () => {
  assert.equal(
    parseTramitesEstadoFromSearch('?estado=en_revision_tesoreria_2'),
    'en_revision_tesoreria_2',
  );
  assert.equal(
    parseTramitesEstadoFromSearch('?estado=invalido'),
    '',
  );

  assert.deepEqual(
    parseTramitesReturnContextFromSearch('?returnTo=%2Fdashboard&returnLabel=Dashboard'),
    {
      returnTo: '/dashboard',
      returnLabel: 'Dashboard',
    },
  );

  assert.deepEqual(
    parseTramitesReturnContextFromSearch('?returnTo=%2F%2Fevil.com&returnLabel=hack'),
    {
      returnTo: '',
      returnLabel: '',
    },
  );
});

test('tramitesPageHelpers construye rutas y labels de retorno compatibles con dashboard', () => {
  assert.equal(
    buildTramitesSearch({
      estado: 'en_aprobacion_gerencia',
      returnTo: '/dashboard',
      returnLabel: 'Dashboard',
    }),
    '?returnTo=%2Fdashboard&returnLabel=Dashboard&estado=en_aprobacion_gerencia',
  );

  assert.equal(
    buildTramitesRoute({
      estado: 'en_aprobacion_gerencia',
      returnTo: '/dashboard',
      returnLabel: 'Dashboard',
    }),
    '/tramites?returnTo=%2Fdashboard&returnLabel=Dashboard&estado=en_aprobacion_gerencia',
  );

  assert.equal(getTramitesReturnActionLabel('Dashboard'), 'Volver al dashboard');
  assert.equal(getTramitesReturnActionLabel('Facturas'), 'Volver a Facturas');
  assert.equal(getTramitesReturnActionLabel(''), 'Volver');
});

test('tramitesPageHelpers construye search canonico sin depender de estado local duplicado', () => {
  assert.equal(
    buildTramitesSearch({
      estado: 'invalido',
      returnTo: '/dashboard',
      returnLabel: 'Dashboard',
    }),
    '?returnTo=%2Fdashboard&returnLabel=Dashboard',
  );

  assert.equal(
    buildTramitesSearch({
      estado: '',
      returnTo: '',
      returnLabel: '',
    }),
    '',
  );
});
