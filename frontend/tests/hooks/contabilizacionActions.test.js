import test from 'node:test';
import assert from 'node:assert/strict';
import { createContabilizacionActions } from '../../src/hooks/facturaDetalle/contabilizacionActions.js';
import { createMockFn } from '../utils/mockFn.js';

const createStateSetter = (initialValue) => {
  let value = initialValue;
  const setter = createMockFn((nextValue) => {
    value = typeof nextValue === 'function' ? nextValue(value) : nextValue;
    return value;
  });
  setter.value = () => value;
  return setter;
};

const createFileReaderStub = () => {
  const previousFileReader = globalThis.FileReader;
  globalThis.FileReader = class {
    readAsDataURL(file) {
      this.result = `data:${file.type || 'application/pdf'};base64,${file.base64 || 'cmVzcGFsZG8='}`;
      this.onload();
    }
  };

  return () => {
    globalThis.FileReader = previousFileReader;
  };
};

const completeCentroCostoLine = {
  local_id: 'line-1',
  centro_costo_id: 3,
  codigo: 'ADM',
  nombre: 'Administracion',
  monto: '100'
};

const createHarness = (overrides = {}) => {
  const setConta = createStateSetter(overrides.conta || {
    proveedor_id: '7',
    tabla_pago_id: '8',
    orden_compra_id: '9',
    nota_credito_id: '10',
    monto_nota_credito: '25.50',
    metadata: {
      centros_costo_lineas: [completeCentroCostoLine]
    }
  });

  const facturaApi = {
    getTablasPago: createMockFn(async () => ({ data: { data: [{ id: 8, nombre: 'Tabla' }] } })),
    getOrdenesCompra: createMockFn(async () => ({ data: { data: [{ id: 9, nombre: 'OC-9' }] } })),
    getNotasCredito: createMockFn(async () => ({ data: { data: { items: [{ id: 10, resumen: { TotalComprobante: 25.5 } }] } } })),
    saveContabilizacion: createMockFn(async () => ({ data: { success: true } })),
    uploadDocumentoRespaldo: createMockFn(async () => ({ data: { success: true } })),
    deleteDocumentoRespaldo: createMockFn(async () => ({ data: { success: true } })),
    registrarPagoRetencion: createMockFn(async () => ({ data: { success: true } })),
    ...overrides.facturaApi
  };

  const setters = {
    setConta,
    setContaSaving: createMockFn(),
    setContaSavingAction: createMockFn(),
    setContaMessage: createMockFn(),
    setContaError: createMockFn(),
    setTablasPagoProveedor: createMockFn(),
    setTablaPagoActual: createMockFn(),
    setTablasModalOpen: createMockFn(),
    setTablasError: createMockFn(),
    setTablasLoading: createMockFn(),
    setOrdenesCompraProveedor: createMockFn(),
    setOrdenCompraActual: createMockFn(),
    setOrdenesModalOpen: createMockFn(),
    setOrdenesError: createMockFn(),
    setOrdenesLoading: createMockFn(),
    setNotasCreditoProveedor: createMockFn(),
    setNotaCreditoActual: createMockFn(),
    setNotasModalOpen: createMockFn(),
    setNotasError: createMockFn(),
    setNotasLoading: createMockFn(),
    setCentrosCostoModalOpen: createMockFn(),
    setCentrosCostoTargetLineId: createMockFn(),
    setCentrosCostoError: createMockFn(),
    setCentrosCostoLoading: createMockFn(),
    setRetencionPagoMonto: createMockFn(),
    setRetencionPagoNotas: createMockFn(),
    setRetencionPagoSaving: createMockFn(),
    setRetencionPagoError: createMockFn(),
    setRetencionPagoMessage: createMockFn(),
    ...overrides.setters
  };

  const fetchAll = createMockFn(async () => undefined);
  const actions = createContabilizacionActions({
    id: 44,
    factura: overrides.factura || { id: 44, sociedad_id: 18 },
    conta: setConta.value(),
    centrosCostoCatalogo: overrides.centrosCostoCatalogo || [{ id: 3, codigo: 'ADM', nombre: 'Administracion' }],
    retencionPagoMonto: overrides.retencionPagoMonto || '15.25',
    retencionPagoFecha: overrides.retencionPagoFecha || '2026-03-18',
    retencionPagoNotas: overrides.retencionPagoNotas || 'pagado',
    fetchAll,
    facturaApi,
    ...setters
  });

  return {
    actions,
    facturaApi,
    fetchAll,
    setters,
    setConta
  };
};

test('guardarContabilizacion valida centros de costo antes de finalizar', async () => {
  const { actions, facturaApi, setters } = createHarness({
    conta: {
      proveedor_id: '7',
      metadata: { centros_costo_lineas: [] }
    }
  });

  await actions.guardarContabilizacion({ preventDefault: createMockFn() });

  assert.equal(facturaApi.saveContabilizacion.calls.length, 0);
  assert.equal(
    setters.setContaError.calls.at(-1)[0],
    'Agrega al menos un centro de costo antes de continuar.'
  );
  assert.deepEqual(setters.setContaSaving.calls.map((call) => call[0]), [true, false]);
});

test('guardarBorrador normaliza payload y permite guardar sin distribucion completa', async () => {
  const { actions, facturaApi, fetchAll, setters } = createHarness({
    conta: {
      proveedor_id: '7',
      tabla_pago_id: '8',
      orden_compra_id: '9',
      nota_credito_id: '10',
      monto_nota_credito: '',
      metadata: { centros_costo_lineas: [] }
    }
  });

  await actions.guardarBorrador({ preventDefault: createMockFn() });

  assert.equal(facturaApi.saveContabilizacion.calls.length, 1);
  assert.equal(facturaApi.saveContabilizacion.calls[0][0], 44);
  assert.equal(facturaApi.saveContabilizacion.calls[0][1].proveedor_id, 7);
  assert.equal(facturaApi.saveContabilizacion.calls[0][1].tabla_pago_id, 8);
  assert.equal(facturaApi.saveContabilizacion.calls[0][1].orden_compra_id, 9);
  assert.equal(facturaApi.saveContabilizacion.calls[0][1].nota_credito_id, 10);
  assert.equal(facturaApi.saveContabilizacion.calls[0][1].monto_nota_credito, null);
  assert.equal(facturaApi.saveContabilizacion.calls[0][1].workflow_action, 'save_draft');
  assert.equal(fetchAll.calls.length, 1);
  assert.equal(setters.setContaMessage.calls.at(-1)[0], 'Borrador guardado en revisión contable.');
});

test('acciones de asociacion cargan candidatos y actualizan el formulario', async () => {
  const { actions, facturaApi, setters, setConta } = createHarness();

  await actions.abrirAsociarTablaPago();
  await actions.abrirAsociarOrdenCompra();
  await actions.abrirAsociarNotaCredito();

  assert.deepEqual(facturaApi.getTablasPago.calls[0][0], { sociedadId: 18, proveedorId: 7 });
  assert.deepEqual(facturaApi.getOrdenesCompra.calls[0][0], { sociedadId: 18, proveedorId: 7, estado: 'abierta' });
  assert.deepEqual(facturaApi.getNotasCredito.calls[0][0], { sociedadId: 18, proveedorId: 7 });
  assert.deepEqual(setters.setTablasPagoProveedor.calls.at(-1)[0], [{ id: 8, nombre: 'Tabla' }]);
  assert.deepEqual(setters.setOrdenesCompraProveedor.calls.at(-1)[0], [{ id: 9, nombre: 'OC-9' }]);
  assert.deepEqual(setters.setNotasCreditoProveedor.calls.at(-1)[0], [{ id: 10, resumen: { TotalComprobante: 25.5 } }]);

  actions.asociarOrdenCompra({ id: 11, nombre: 'OC-11' });
  assert.equal(setters.setOrdenCompraActual.calls.at(-1)[0].id, 11);
  assert.equal(setConta.value().orden_compra_id, '11');
  assert.equal(setConta.value().orden_compra, 'OC-11');

  actions.desenlazarOrdenCompra();
  assert.equal(setConta.value().orden_compra_id, '');
  assert.equal(setConta.value().orden_compra, '');
  assert.equal(setters.setOrdenCompraActual.calls.at(-1)[0], null);
});

test('acciones de centros de costo actualizan lineas y selector', () => {
  const { actions, setters, setConta } = createHarness({
    centrosCostoCatalogo: []
  });

  actions.abrirSelectorCentrosCosto('line-1');
  assert.equal(
    setters.setCentrosCostoError.calls.at(-1)[0],
    'No hay centros de costo cargados para esta sociedad.'
  );

  actions.addCentroCostoLinea();
  assert.equal(setConta.value().metadata.centros_costo_lineas.length, 2);

  actions.actualizarMontoCentroCosto('line-1', '150');
  assert.equal(setConta.value().metadata.centros_costo_lineas[0].monto, '150');

  actions.seleccionarCentroCostoEnLinea('line-1', {
    id: 12,
    codigo: 'VENTAS',
    nombre: 'Ventas'
  });
  assert.equal(setConta.value().metadata.centros_costo_lineas[0].centro_costo_id, '12');
  assert.equal(setConta.value().metadata.centros_costo_lineas[0].codigo, 'VENTAS');
  assert.equal(setters.setCentrosCostoModalOpen.calls.at(-1)[0], false);

  actions.removeCentroCostoLinea('line-1');
  assert.ok(setConta.value().metadata.centros_costo_lineas.length >= 1);
});

test('subirDocumentosRespaldo valida PDFs y carga archivos validos', async () => {
  const restoreFileReader = createFileReaderStub();
  try {
    const { actions, facturaApi, fetchAll, setters } = createHarness();

    assert.equal(await actions.subirDocumentosRespaldo([]), false);
    assert.equal(setters.setContaError.calls.at(-1)[0], 'Selecciona al menos un PDF de respaldo.');

    assert.equal(await actions.subirDocumentosRespaldo([{ name: 'nota.txt', type: 'text/plain' }]), false);
    assert.equal(setters.setContaError.calls.at(-1)[0], '"nota.txt" no es un PDF valido.');

    assert.equal(await actions.subirDocumentosRespaldo([{ name: 'respaldo.pdf', type: 'application/pdf' }]), true);
    assert.deepEqual(facturaApi.uploadDocumentoRespaldo.calls.at(-1), [44, {
      filename: 'respaldo.pdf',
      file_base64: 'cmVzcGFsZG8='
    }]);
    assert.equal(setters.setContaMessage.calls.at(-1)[0], 'Documento de respaldo cargado correctamente.');
    assert.equal(fetchAll.calls.length, 1);
  } finally {
    restoreFileReader();
  }
});

test('eliminarDocumentoRespaldo y registrarPagoRetencion manejan validaciones y exito', async () => {
  const invalid = createHarness({ retencionPagoMonto: '0' });

  assert.equal(await invalid.actions.eliminarDocumentoRespaldo({}), false);
  assert.equal(invalid.setters.setContaError.calls.at(-1)[0], 'Documento de respaldo invalido.');

  await invalid.actions.registrarPagoRetencion({ preventDefault: createMockFn() });
  assert.equal(invalid.facturaApi.registrarPagoRetencion.calls.length, 0);
  assert.equal(invalid.setters.setRetencionPagoError.calls.at(-1)[0], 'Ingrese un monto valido mayor a 0.');

  const valid = createHarness();
  assert.equal(await valid.actions.eliminarDocumentoRespaldo({ id: 90 }), true);
  assert.deepEqual(valid.facturaApi.deleteDocumentoRespaldo.calls.at(-1), [44, 90]);
  assert.equal(valid.setters.setContaMessage.calls.at(-1)[0], 'Documento de respaldo eliminado.');

  await valid.actions.registrarPagoRetencion({ preventDefault: createMockFn() });
  assert.deepEqual(valid.facturaApi.registrarPagoRetencion.calls.at(-1), [44, {
    monto: 15.25,
    fecha_pago: '2026-03-18',
    notas: 'pagado'
  }]);
  assert.equal(valid.setters.setRetencionPagoMonto.calls.at(-1)[0], '');
  assert.equal(valid.setters.setRetencionPagoNotas.calls.at(-1)[0], '');
  assert.equal(valid.setters.setRetencionPagoMessage.calls.at(-1)[0], 'Pago de retención registrado.');
});
