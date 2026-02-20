import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturaDetalleActions } from '../../src/hooks/facturaDetalle/useFacturaDetalleActions.js';
import { createMockFn } from '../utils/mockFn.js';

const createNoop = () => {};

const createBaseProps = () => ({
  id: 42,
  factura: { sociedad_id: 10, has_mensaje_hacienda: true, estado: 'en_revision' },
  conta: {
    proveedor_id: '5',
    tabla_pago_id: '',
    nota_credito_id: '',
    monto_nota_credito: 0
  },
  proveedoresSociedad: [{ id: 5, identificacion_numero: '3101122334' }],
  tablaPagoActual: null,
  notaCreditoActual: null,
  commentUser: 'admin',
  commentText: 'texto',
  estadoNuevo: 'contabilizado',
  estadoUser: 'admin',
  estadoMotivo: '',
  retencionPagoMonto: '100',
  retencionPagoFecha: '2026-02-18',
  retencionPagoNotas: 'nota',
  fetchAll: createMockFn(async () => {}),
  setComentarios: createNoop,
  setCommentText: createNoop,
  setEstadoMotivo: createNoop,
  setEstadoNuevo: createNoop,
  setConta: createNoop,
  setContaSaving: createNoop,
  setContaMessage: createNoop,
  setContaError: createNoop,
  setTablasPagoProveedor: createNoop,
  setTablaPagoActual: createNoop,
  setTablasModalOpen: createNoop,
  setTablasError: createNoop,
  setTablasLoading: createNoop,
  setNotasCreditoProveedor: createNoop,
  setNotaCreditoActual: createNoop,
  setNotasModalOpen: createNoop,
  setNotasError: createNoop,
  setNotasLoading: createNoop,
  setRetencionPagoMonto: createNoop,
  setRetencionPagoNotas: createNoop,
  setRetencionPagoSaving: createNoop,
  setRetencionPagoError: createNoop,
  setRetencionPagoMessage: createNoop,
  setMhLoading: createNoop,
  setMhError: createNoop
});

test('useFacturaDetalleActions usa dependencias inyectadas para guardar contabilizacion', async () => {
  const saveContabilizacion = createMockFn(async () => ({}));
  const facturaApi = {
    saveContabilizacion,
    registrarPagoRetencion: createMockFn(async () => ({})),
    getTablasPago: createMockFn(async () => ({ data: { data: [] } })),
    getNotasCredito: createMockFn(async () => ({ data: { data: [] } })),
    addComentario: createMockFn(async () => ({})),
    getComentarios: createMockFn(async () => ({ data: { data: [] } })),
    addEstado: createMockFn(async () => ({})),
    patchEstado: createMockFn(async () => ({})),
    getMensajeHacienda: createMockFn(async () => ({ data: { data: { ruta_xml: 'mh.xml' } } }))
  };

  const fetchAll = createMockFn(async () => {});
  const props = createBaseProps();
  props.fetchAll = fetchAll;

  const actions = useFacturaDetalleActions({
    ...props,
    dependencies: {
      facturaApi,
      buildAuthUrl: (url) => url,
      openWindow: createMockFn()
    }
  });

  const preventDefault = createMockFn();
  await actions.guardarContabilizacion({ preventDefault });

  assert.equal(preventDefault.calls.length, 1);
  assert.equal(saveContabilizacion.calls.length, 1);
  assert.equal(fetchAll.calls.length, 1);
  assert.equal(saveContabilizacion.calls[0][0], 42);
  assert.equal(saveContabilizacion.calls[0][1].proveedor_id, 5);
});

test('useFacturaDetalleActions usa buildAuthUrl/openWindow inyectados para ver manifiesto', () => {
  const openWindow = createMockFn();
  const buildAuthUrl = createMockFn((url) => `auth:${url}`);
  const facturaApi = {
    saveContabilizacion: createMockFn(async () => ({})),
    registrarPagoRetencion: createMockFn(async () => ({})),
    getTablasPago: createMockFn(async () => ({ data: { data: [] } })),
    getNotasCredito: createMockFn(async () => ({ data: { data: [] } })),
    addComentario: createMockFn(async () => ({})),
    getComentarios: createMockFn(async () => ({ data: { data: [] } })),
    addEstado: createMockFn(async () => ({})),
    patchEstado: createMockFn(async () => ({})),
    getMensajeHacienda: createMockFn(async () => ({ data: { data: { ruta_xml: 'mh.xml' } } }))
  };

  const actions = useFacturaDetalleActions({
    ...createBaseProps(),
    dependencies: {
      facturaApi,
      buildAuthUrl,
      openWindow
    }
  });

  actions.verManifest();

  assert.equal(buildAuthUrl.calls.length, 1);
  assert.equal(buildAuthUrl.calls[0][0], '/api/facturas/42/manifest');
  assert.equal(openWindow.calls.length, 1);
  assert.deepEqual(openWindow.calls[0], [
    'auth:/api/facturas/42/manifest',
    '_blank',
    'noopener,noreferrer'
  ]);
});

test('useFacturaDetalleActions permite extender acciones via actionModules sin tocar el core', () => {
  const customAction = createMockFn(() => 'ok');
  const customModule = createMockFn((context) => ({
    accionPersonalizada: () => customAction(context.id, context.estadoUser)
  }));

  const actions = useFacturaDetalleActions({
    ...createBaseProps(),
    dependencies: {
      actionModules: [customModule]
    }
  });

  const result = actions.accionPersonalizada();

  assert.equal(customModule.calls.length, 1);
  assert.equal(customAction.calls.length, 1);
  assert.deepEqual(customAction.calls[0], [42, 'admin']);
  assert.equal(result, 'ok');
});

test('useFacturaDetalleActions protege contra nombres de accion duplicados en modulos', () => {
  const duplicatedModules = [
    () => ({ accionDuplicada: () => 'a' }),
    () => ({ accionDuplicada: () => 'b' })
  ];

  assert.throws(() => {
    useFacturaDetalleActions({
      ...createBaseProps(),
      dependencies: {
        actionModules: duplicatedModules
      }
    });
  }, /FacturaDetalle action duplicated/);
});
