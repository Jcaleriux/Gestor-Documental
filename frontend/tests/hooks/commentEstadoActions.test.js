import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommentEstadoActions } from '../../src/hooks/facturaDetalle/commentEstadoActions.js';
import { createMockFn } from '../utils/mockFn.js';

const createNoop = () => {};

const createApiFixture = () => ({
  addComentario: createMockFn(async () => ({})),
  getComentarios: createMockFn(async () => ({ data: { data: [{ id: 1, texto: 'ok' }] } })),
  addEstado: createMockFn(async () => ({})),
  patchEstado: createMockFn(async () => ({}))
});

test('createCommentEstadoActions.addComment guarda comentario y refresca lista', async () => {
  const facturaApi = createApiFixture();
  const setComentarios = createMockFn();
  const setCommentText = createMockFn();

  const actions = createCommentEstadoActions({
    id: 42,
    factura: { estado: 'en_revision' },
    commentUser: 'admin',
    commentText: 'nuevo comentario',
    estadoNuevo: 'contabilizado',
    estadoUser: 'admin',
    estadoMotivo: '',
    fetchAll: createMockFn(async () => {}),
    setComentarios,
    setCommentText,
    setEstadoMotivo: createNoop,
    setEstadoNuevo: createNoop,
    facturaApi
  });

  const preventDefault = createMockFn();
  await actions.addComment({ preventDefault });

  assert.equal(preventDefault.calls.length, 1);
  assert.equal(facturaApi.addComentario.calls.length, 1);
  assert.equal(facturaApi.addComentario.calls[0][0], 42);
  assert.deepEqual(facturaApi.addComentario.calls[0][1], {
    usuario: 'admin',
    texto: 'nuevo comentario'
  });
  assert.equal(facturaApi.getComentarios.calls.length, 1);
  assert.equal(setCommentText.calls.length, 1);
  assert.equal(setCommentText.calls[0][0], '');
  assert.deepEqual(setComentarios.calls[0][0], [{ id: 1, texto: 'ok' }]);
});

test('createCommentEstadoActions.addComment no hace nada si faltan datos', async () => {
  const facturaApi = createApiFixture();
  const actions = createCommentEstadoActions({
    id: 42,
    factura: { estado: 'en_revision' },
    commentUser: 'admin',
    commentText: '',
    estadoNuevo: 'contabilizado',
    estadoUser: 'admin',
    estadoMotivo: '',
    fetchAll: createMockFn(async () => {}),
    setComentarios: createNoop,
    setCommentText: createNoop,
    setEstadoMotivo: createNoop,
    setEstadoNuevo: createNoop,
    facturaApi
  });

  await actions.addComment({ preventDefault: createNoop });
  assert.equal(facturaApi.addComentario.calls.length, 0);
  assert.equal(facturaApi.getComentarios.calls.length, 0);
});

test('createCommentEstadoActions.changeEstado registra historial, parchea y refresca detalle', async () => {
  const facturaApi = createApiFixture();
  const fetchAll = createMockFn(async () => {});
  const setEstadoMotivo = createMockFn();
  const setEstadoNuevo = createMockFn();

  const actions = createCommentEstadoActions({
    id: 91,
    factura: { estado: 'en_revision' },
    commentUser: 'admin',
    commentText: 'x',
    estadoNuevo: 'contabilizado',
    estadoUser: 'admin',
    estadoMotivo: 'Aprobado',
    fetchAll,
    setComentarios: createNoop,
    setCommentText: createNoop,
    setEstadoMotivo,
    setEstadoNuevo,
    facturaApi
  });

  const preventDefault = createMockFn();
  await actions.changeEstado({ preventDefault });

  assert.equal(preventDefault.calls.length, 1);
  assert.equal(facturaApi.addEstado.calls.length, 1);
  assert.equal(facturaApi.addEstado.calls[0][0], 91);
  assert.deepEqual(facturaApi.addEstado.calls[0][1], {
    estado_anterior: 'en_revision',
    estado_nuevo: 'contabilizado',
    usuario: 'admin',
    motivo: 'Aprobado'
  });
  assert.equal(facturaApi.patchEstado.calls.length, 1);
  assert.equal(facturaApi.patchEstado.calls[0][0], 91);
  assert.deepEqual(facturaApi.patchEstado.calls[0][1], {
    estado: 'contabilizado'
  });
  assert.equal(setEstadoMotivo.calls[0][0], '');
  assert.equal(setEstadoNuevo.calls[0][0], '');
  assert.equal(fetchAll.calls.length, 1);
});

test('createCommentEstadoActions.changeEstado no ejecuta API si faltan datos', async () => {
  const facturaApi = createApiFixture();
  const actions = createCommentEstadoActions({
    id: 13,
    factura: null,
    commentUser: 'admin',
    commentText: 'x',
    estadoNuevo: 'contabilizado',
    estadoUser: 'admin',
    estadoMotivo: '',
    fetchAll: createMockFn(async () => {}),
    setComentarios: createNoop,
    setCommentText: createNoop,
    setEstadoMotivo: createNoop,
    setEstadoNuevo: createNoop,
    facturaApi
  });

  await actions.changeEstado({ preventDefault: createNoop });
  assert.equal(facturaApi.addEstado.calls.length, 0);
  assert.equal(facturaApi.patchEstado.calls.length, 0);
});
