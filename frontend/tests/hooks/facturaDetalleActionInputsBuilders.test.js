import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommentEstadoModuleInputs,
  buildContabilizacionCoreActionInputs,
  buildContabilizacionTablasActionInputs,
  buildContabilizacionOrdenesActionInputs,
  buildContabilizacionNotasActionInputs,
  buildContabilizacionRetencionActionInputs,
  buildContabilizacionModuleInputs,
  buildDocumentModuleInputs,
  buildFacturaDetalleActionModuleInputs
} from '../../src/hooks/facturaDetalle/facturaDetalleActionInputsBuilders.js';

const createDataFixture = () => {
  const noop = () => {};

  return {
    factura: { id: 1001 },
    commentUser: 'admin',
    commentText: 'comentario',
    estadoNuevo: 'contabilizado',
    estadoUser: 'admin',
    estadoMotivo: 'ok',
    fetchAll: noop,
    setComentarios: noop,
    setCommentText: noop,
    setEstadoMotivo: noop,
    setEstadoNuevo: noop,
    conta: { proveedor_id: '55' },
    proveedoresSociedad: [{ id: 55 }],
    setConta: noop,
    setContaSaving: noop,
    setContaMessage: noop,
    setContaError: noop,
    setTablasPagoProveedor: noop,
    setTablaPagoActual: noop,
    setTablasModalOpen: noop,
    setTablasError: noop,
    setTablasLoading: noop,
    setOrdenesCompraProveedor: noop,
    setOrdenCompraActual: noop,
    setOrdenesModalOpen: noop,
    setOrdenesError: noop,
    setOrdenesLoading: noop,
    setNotasCreditoProveedor: noop,
    setNotaCreditoActual: noop,
    setNotasModalOpen: noop,
    setNotasError: noop,
    setNotasLoading: noop,
    retencionPagoMonto: '10',
    retencionPagoFecha: '2026-02-27',
    retencionPagoNotas: 'nota',
    setRetencionPagoMonto: noop,
    setRetencionPagoNotas: noop,
    setRetencionPagoSaving: noop,
    setRetencionPagoError: noop,
    setRetencionPagoMessage: noop,
    tablaPagoActual: { id: 7 },
    ordenCompraActual: { id: 8 },
    notaCreditoActual: { id: 9 },
    setMhLoading: noop,
    setMhError: noop
  };
};

test('builders por seccion crean contratos esperados', () => {
  const data = createDataFixture();

  const commentInputs = buildCommentEstadoModuleInputs({ id: 44, data });
  const contaInputs = buildContabilizacionModuleInputs({ id: 44, data });
  const documentInputs = buildDocumentModuleInputs({ id: 44, data });

  assert.equal(commentInputs.id, 44);
  assert.equal(commentInputs.commentText, 'comentario');
  assert.equal(commentInputs.fetchAll, data.fetchAll);

  assert.equal(contaInputs.id, 44);
  assert.equal(contaInputs.conta, data.conta);
  assert.equal(contaInputs.setOrdenesModalOpen, data.setOrdenesModalOpen);
  assert.equal(contaInputs.retencionPagoMonto, '10');

  assert.equal(documentInputs.id, 44);
  assert.equal(documentInputs.tablaPagoActual, data.tablaPagoActual);
  assert.equal(documentInputs.setMhError, data.setMhError);
});

test('sub-builders de contabilizacion dividen contrato por responsabilidad', () => {
  const data = createDataFixture();

  const core = buildContabilizacionCoreActionInputs({ id: 55, data });
  const tablas = buildContabilizacionTablasActionInputs({ data });
  const ordenes = buildContabilizacionOrdenesActionInputs({ data });
  const notas = buildContabilizacionNotasActionInputs({ data });
  const retencion = buildContabilizacionRetencionActionInputs({ data });

  assert.equal(core.id, 55);
  assert.equal(core.fetchAll, data.fetchAll);
  assert.equal(tablas.setTablasModalOpen, data.setTablasModalOpen);
  assert.equal(ordenes.setOrdenesLoading, data.setOrdenesLoading);
  assert.equal(notas.setNotasError, data.setNotasError);
  assert.equal(retencion.setRetencionPagoMessage, data.setRetencionPagoMessage);
});

test('buildFacturaDetalleActionModuleInputs compone scopes de acciones', () => {
  const data = createDataFixture();
  const moduleInputs = buildFacturaDetalleActionModuleInputs({ id: 81, data });

  assert.deepEqual(Object.keys(moduleInputs), ['commentEstado', 'contabilizacion', 'document']);
  assert.equal(moduleInputs.commentEstado.id, 81);
  assert.equal(moduleInputs.contabilizacion.id, 81);
  assert.equal(moduleInputs.document.id, 81);
});
