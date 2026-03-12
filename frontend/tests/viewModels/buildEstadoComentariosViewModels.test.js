import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  ESTADOS_VIEWMODEL,
  buildEstadoViewModel,
  buildHistorialViewModel,
  buildComentariosViewModel,
  buildEstadoComentariosViewModels
} from '../../src/components/facturaDetalle/viewModels/buildEstadoComentariosViewModels.js';

const createDetalleFixture = () => ({
  estadoUser: 'admin',
  setEstadoUser: createMockFn(),
  estadoNuevo: 'contabilizado',
  setEstadoNuevo: createMockFn(),
  estadoMotivo: 'ok',
  setEstadoMotivo: createMockFn(),
  changeEstado: createMockFn(),
  estados: [{ id: 1, estado_nuevo: 'en_revision' }],
  commentUser: 'admin',
  setCommentUser: createMockFn(),
  commentText: 'comentario',
  setCommentText: createMockFn(),
  addComment: createMockFn(),
  comentarios: [{ id: 10, texto: 'nota' }]
});

test('sub-builders de estado/comentarios conservan contratos por seccion', () => {
  const detalle = createDetalleFixture();

  const estado = buildEstadoViewModel({ detalle });
  const historial = buildHistorialViewModel({ detalle });
  const comentarios = buildComentariosViewModel({ detalle });

  assert.deepEqual(estado.estadosDisponibles, ESTADOS_VIEWMODEL);
  assert.equal(estado.estadoUser, 'admin');
  assert.equal(estado.changeEstado, detalle.changeEstado);
  assert.equal(historial.estados.length, 1);
  assert.equal(comentarios.commentText, 'comentario');
  assert.equal(comentarios.addComment, detalle.addComment);
});

test('buildEstadoComentariosViewModels compone estado/historial/comentarios', () => {
  const detalle = createDetalleFixture();
  const vm = buildEstadoComentariosViewModels({ detalle });

  assert.equal(vm.estado.estadoNuevo, 'contabilizado');
  assert.equal(vm.historial.estados.length, 1);
  assert.equal(vm.comentarios.comentarios.length, 1);
});
