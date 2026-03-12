import test from 'node:test';
import assert from 'node:assert/strict';
import { useFacturaDetalleActions } from '../../src/hooks/facturaDetalle/useFacturaDetalleActions.js';
import { createScopedActionModule } from '../../src/hooks/facturaDetalle/actionRegistry.js';
import { createMockFn } from '../utils/mockFn.js';

const createNoop = () => {};

const createBaseModuleInputs = () => {
  const fetchAll = createMockFn(async () => {});

  return {
    commentEstado: {
      id: 42,
      factura: { sociedad_id: 10, has_mensaje_hacienda: true, estado: 'en_revision' },
      commentUser: 'admin',
      commentText: 'texto',
      estadoNuevo: 'contabilizado',
      estadoUser: 'admin',
      estadoMotivo: '',
      fetchAll,
      setComentarios: createNoop,
      setCommentText: createNoop,
      setEstadoMotivo: createNoop,
      setEstadoNuevo: createNoop
    },
    contabilizacion: {
      id: 42,
      factura: { sociedad_id: 10, has_mensaje_hacienda: true, estado: 'en_revision' },
      conta: {
        proveedor_id: '5',
        tabla_pago_id: '',
        nota_credito_id: '',
        monto_nota_credito: 0
      },
      proveedoresSociedad: [{ id: 5, identificacion_numero: '3101122334' }],
      setConta: createNoop,
      setContaSaving: createNoop,
      setContaMessage: createNoop,
      setContaError: createNoop,
      setTablasPagoProveedor: createNoop,
      setTablaPagoActual: createNoop,
      setTablasModalOpen: createNoop,
      setTablasError: createNoop,
      setTablasLoading: createNoop,
      setOrdenesCompraProveedor: createNoop,
      setOrdenCompraActual: createNoop,
      setOrdenesModalOpen: createNoop,
      setOrdenesError: createNoop,
      setOrdenesLoading: createNoop,
      setNotasCreditoProveedor: createNoop,
      setNotaCreditoActual: createNoop,
      setNotasModalOpen: createNoop,
      setNotasError: createNoop,
      setNotasLoading: createNoop,
      retencionPagoMonto: '100',
      retencionPagoFecha: '2026-02-18',
      retencionPagoNotas: 'nota',
      setRetencionPagoMonto: createNoop,
      setRetencionPagoNotas: createNoop,
      setRetencionPagoSaving: createNoop,
      setRetencionPagoError: createNoop,
      setRetencionPagoMessage: createNoop,
      fetchAll
    },
    document: {
      id: 42,
      factura: { sociedad_id: 10, has_mensaje_hacienda: true, estado: 'en_revision' },
      tablaPagoActual: null,
      ordenCompraActual: null,
      notaCreditoActual: null,
      setMhLoading: createNoop,
      setMhError: createNoop
    }
  };
};

test('useFacturaDetalleActions usa dependencias inyectadas para guardar contabilizacion', async () => {
  const saveContabilizacion = createMockFn(async () => ({}));
  const facturaApi = {
    saveContabilizacion,
    registrarPagoRetencion: createMockFn(async () => ({})),
    getTablasPago: createMockFn(async () => ({ data: { data: [] } })),
    getOrdenesCompra: createMockFn(async () => ({ data: { data: [] } })),
    getNotasCredito: createMockFn(async () => ({ data: { data: [] } })),
    addComentario: createMockFn(async () => ({})),
    getComentarios: createMockFn(async () => ({ data: { data: [] } })),
    addEstado: createMockFn(async () => ({})),
    patchEstado: createMockFn(async () => ({})),
    getMensajeHacienda: createMockFn(async () => ({ data: { data: { ruta_xml: 'mh.xml' } } }))
  };

  const moduleInputs = createBaseModuleInputs();
  const fetchAll = createMockFn(async () => {});
  moduleInputs.commentEstado.fetchAll = fetchAll;
  moduleInputs.contabilizacion.fetchAll = fetchAll;

  const actions = useFacturaDetalleActions({
    moduleInputs,
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
    getOrdenesCompra: createMockFn(async () => ({ data: { data: [] } })),
    getNotasCredito: createMockFn(async () => ({ data: { data: [] } })),
    addComentario: createMockFn(async () => ({})),
    getComentarios: createMockFn(async () => ({ data: { data: [] } })),
    addEstado: createMockFn(async () => ({})),
    patchEstado: createMockFn(async () => ({})),
    getMensajeHacienda: createMockFn(async () => ({ data: { data: { ruta_xml: 'mh.xml' } } }))
  };

  const actions = useFacturaDetalleActions({
    moduleInputs: createBaseModuleInputs(),
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

test('useFacturaDetalleActions permite extender acciones por scope sin exponer contexto global', () => {
  const createActions = createMockFn(({ moduleInputs, shared, scope }) => ({
    inspeccionar: () => ({
      scope,
      id: moduleInputs.id,
      estadoUser: moduleInputs.estadoUser,
      hasShared: Boolean(shared)
    })
  }));

  const scopedModule = createScopedActionModule({
    name: 'customScopedModule',
    scope: 'commentEstado',
    createActions
  });

  const actions = useFacturaDetalleActions({
    moduleInputs: createBaseModuleInputs(),
    dependencies: {
      actionModules: [scopedModule]
    }
  });

  const info = actions.inspeccionar();

  assert.equal(createActions.calls.length, 1);
  assert.equal(info.scope, 'commentEstado');
  assert.equal(info.id, 42);
  assert.equal(info.estadoUser, 'admin');
  assert.equal(info.hasShared, true);
});

test('useFacturaDetalleActions protege contra nombres de accion duplicados en modulos', () => {
  const duplicatedModules = [
    createScopedActionModule({
      name: 'moduleA',
      scope: 'commentEstado',
      createActions: () => ({ accionDuplicada: () => 'a' })
    }),
    createScopedActionModule({
      name: 'moduleB',
      scope: 'contabilizacion',
      createActions: () => ({ accionDuplicada: () => 'b' })
    })
  ];

  assert.throws(() => {
    useFacturaDetalleActions({
      moduleInputs: createBaseModuleInputs(),
      dependencies: {
        actionModules: duplicatedModules
      }
    });
  }, /FacturaDetalle action duplicated/);
});

test('useFacturaDetalleActions ya no acepta modulos legacy de funcion', () => {
  const legacyModule = () => ({
    accionPersonalizada: () => 42
  });

  assert.throws(() => {
    useFacturaDetalleActions({
      moduleInputs: createBaseModuleInputs(),
      dependencies: {
        actionModules: [legacyModule]
      }
    });
  }, /legacy action modules ya no son soportados/);
});

test('useFacturaDetalleActions ya no acepta actionInputs legacy', () => {
  assert.throws(() => {
    useFacturaDetalleActions({
      moduleInputs: createBaseModuleInputs(),
      actionInputs: createBaseModuleInputs()
    });
  }, /actionInputs ya no es soportado/);
});
