import { getNotaCreditoTotal } from './utils.js';

const requireFacturaSociedadId = ({ factura, setContaError }) => {
  if (!factura?.sociedad_id) {
    setContaError('No se encontro la sociedad de la factura.');
    return null;
  }
  return factura.sociedad_id;
};

const requireProveedorId = ({ conta, setContaError, missingProveedorError }) => {
  const proveedorId = Number(conta.proveedor_id);
  if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
    setContaError(missingProveedorError);
    return null;
  }
  return proveedorId;
};

const loadAssociationCandidates = async ({
  fetchItems,
  setLoading,
  setError,
  setItems,
  setModalOpen,
  fallbackError
}) => {
  try {
    setLoading(true);
    setError('');
    const items = await fetchItems();
    setItems(items);
    setModalOpen(true);
  } catch (err) {
    const apiError = err.response?.data?.error || fallbackError;
    setError(apiError);
  } finally {
    setLoading(false);
  }
};

const associateItem = ({
  item,
  setCurrent,
  setConta,
  mapContaFields,
  setModalOpen
}) => {
  if (!item) {
    return;
  }

  setCurrent(item);
  setConta((prev) => ({
    ...prev,
    ...mapContaFields(item, prev)
  }));
  setModalOpen(false);
};

const createSelectionClearers = ({
  setTablasPagoProveedor,
  setTablaPagoActual,
  setTablasModalOpen,
  setTablasError,
  setOrdenesCompraProveedor,
  setOrdenCompraActual,
  setOrdenesModalOpen,
  setOrdenesError,
  setNotasCreditoProveedor,
  setNotaCreditoActual,
  setNotasModalOpen,
  setNotasError,
  setConta
}) => ({
  clearTablaSelection: () => {
    setTablasPagoProveedor([]);
    setTablaPagoActual(null);
    setTablasModalOpen(false);
    setTablasError('');
    setConta((prev) => ({
      ...prev,
      tabla_pago_id: ''
    }));
  },
  clearOrdenCompraSelection: () => {
    setOrdenesCompraProveedor([]);
    setOrdenCompraActual(null);
    setOrdenesModalOpen(false);
    setOrdenesError('');
    setConta((prev) => ({
      ...prev,
      orden_compra_id: '',
      orden_compra: ''
    }));
  },
  clearNotaCreditoSelection: () => {
    setNotasCreditoProveedor([]);
    setNotaCreditoActual(null);
    setNotasModalOpen(false);
    setNotasError('');
    setConta((prev) => ({
      ...prev,
      nota_credito_id: '',
      monto_nota_credito: 0
    }));
  }
});

const buildContabilizacionPayload = ({ conta }) => ({
  ...conta,
  proveedor_id: conta.proveedor_id ? Number(conta.proveedor_id) : null,
  tabla_pago_id: conta.tabla_pago_id ? Number(conta.tabla_pago_id) : null,
  orden_compra_id: conta.orden_compra_id ? Number(conta.orden_compra_id) : null,
  nota_credito_id: conta.nota_credito_id ? Number(conta.nota_credito_id) : null,
  monto_nota_credito: conta.monto_nota_credito === '' || Number.isNaN(Number(conta.monto_nota_credito))
    ? null
    : Number(conta.monto_nota_credito),
  usuario: 'admin'
});

const buildRetencionPayload = ({
  monto,
  retencionPagoFecha,
  retencionPagoNotas
}) => ({
  monto,
  fecha_pago: retencionPagoFecha || null,
  notas: retencionPagoNotas || null,
  usuario: 'admin'
});

const createHandleContaChangeAction = ({
  proveedoresSociedad,
  setConta,
  clearTablaSelection,
  clearOrdenCompraSelection,
  clearNotaCreditoSelection
}) => (field) => (event) => {
  const nextValue = event.target.value;
  if (field === 'proveedor_id') {
    const proveedor = proveedoresSociedad.find((item) => String(item.id) === String(nextValue));
    clearTablaSelection();
    clearOrdenCompraSelection();
    clearNotaCreditoSelection();
    setConta((prev) => ({
      ...prev,
      proveedor_id: nextValue,
      numero_proveedor: proveedor?.identificacion_numero || ''
    }));
    return;
  }

  setConta((prev) => ({ ...prev, [field]: nextValue }));
};

export const createContabilizacionActions = ({
  id,
  factura,
  conta,
  proveedoresSociedad,
  setConta,
  setContaSaving,
  setContaMessage,
  setContaError,
  setTablasPagoProveedor,
  setTablaPagoActual,
  setTablasModalOpen,
  setTablasError,
  setTablasLoading,
  setOrdenesCompraProveedor,
  setOrdenCompraActual,
  setOrdenesModalOpen,
  setOrdenesError,
  setOrdenesLoading,
  setNotasCreditoProveedor,
  setNotaCreditoActual,
  setNotasModalOpen,
  setNotasError,
  setNotasLoading,
  retencionPagoMonto,
  retencionPagoFecha,
  retencionPagoNotas,
  setRetencionPagoMonto,
  setRetencionPagoNotas,
  setRetencionPagoSaving,
  setRetencionPagoError,
  setRetencionPagoMessage,
  fetchAll,
  facturaApi
}) => {
  const {
    clearTablaSelection,
    clearOrdenCompraSelection,
    clearNotaCreditoSelection
  } = createSelectionClearers({
    setTablasPagoProveedor,
    setTablaPagoActual,
    setTablasModalOpen,
    setTablasError,
    setOrdenesCompraProveedor,
    setOrdenCompraActual,
    setOrdenesModalOpen,
    setOrdenesError,
    setNotasCreditoProveedor,
    setNotaCreditoActual,
    setNotasModalOpen,
    setNotasError,
    setConta
  });

  const handleContaChange = createHandleContaChangeAction({
    proveedoresSociedad,
    setConta,
    clearTablaSelection,
    clearOrdenCompraSelection,
    clearNotaCreditoSelection
  });

  const resolveAssociationContext = (missingProveedorError) => {
    const sociedadId = requireFacturaSociedadId({ factura, setContaError });
    if (!sociedadId) {
      return null;
    }

    const proveedorId = requireProveedorId({
      conta,
      setContaError,
      missingProveedorError
    });
    if (!proveedorId) {
      return null;
    }

    return { sociedadId, proveedorId };
  };

  const abrirAsociarTablaPago = async () => {
    const context = resolveAssociationContext('Seleccione un proveedor para asociar la tabla de pagos.');
    if (!context) {
      return;
    }

    await loadAssociationCandidates({
      fetchItems: async () => {
        const response = await facturaApi.getTablasPago({
          sociedadId: context.sociedadId,
          proveedorId: context.proveedorId
        });
        return response.data?.data || [];
      },
      setLoading: setTablasLoading,
      setError: setTablasError,
      setItems: setTablasPagoProveedor,
      setModalOpen: setTablasModalOpen,
      fallbackError: 'No se pudieron cargar las tablas de pago.'
    });
  };

  const asociarTablaPago = (tabla) => {
    associateItem({
      item: tabla,
      setCurrent: setTablaPagoActual,
      setConta,
      mapContaFields: (item) => ({
        tabla_pago_id: String(item.id)
      }),
      setModalOpen: setTablasModalOpen
    });
  };

  const abrirAsociarOrdenCompra = async () => {
    const context = resolveAssociationContext('Seleccione un proveedor para asociar la orden de compra.');
    if (!context) {
      return;
    }

    await loadAssociationCandidates({
      fetchItems: async () => {
        const response = await facturaApi.getOrdenesCompra({
          sociedadId: context.sociedadId,
          proveedorId: context.proveedorId,
          estado: 'abierta'
        });
        return response.data?.data || [];
      },
      setLoading: setOrdenesLoading,
      setError: setOrdenesError,
      setItems: setOrdenesCompraProveedor,
      setModalOpen: setOrdenesModalOpen,
      fallbackError: 'No se pudieron cargar las ordenes de compra.'
    });
  };

  const asociarOrdenCompra = (ordenCompra) => {
    associateItem({
      item: ordenCompra,
      setCurrent: setOrdenCompraActual,
      setConta,
      mapContaFields: (item, prev) => ({
        orden_compra_id: String(item.id),
        orden_compra: item.nombre || prev.orden_compra
      }),
      setModalOpen: setOrdenesModalOpen
    });
  };

  const abrirAsociarNotaCredito = async () => {
    const context = resolveAssociationContext('Seleccione un proveedor para asociar la nota de credito.');
    if (!context) {
      return;
    }

    await loadAssociationCandidates({
      fetchItems: async () => {
        const response = await facturaApi.getNotasCredito({
          sociedadId: context.sociedadId,
          proveedorId: context.proveedorId
        });
        return response.data?.data || [];
      },
      setLoading: setNotasLoading,
      setError: setNotasError,
      setItems: setNotasCreditoProveedor,
      setModalOpen: setNotasModalOpen,
      fallbackError: 'No se pudieron cargar las notas de credito.'
    });
  };

  const asociarNotaCredito = (notaCredito) => {
    associateItem({
      item: notaCredito,
      setCurrent: setNotaCreditoActual,
      setConta,
      mapContaFields: (item, prev) => {
        const montoNota = getNotaCreditoTotal(item);
        return {
          nota_credito_id: String(item.id),
          monto_nota_credito: montoNota ?? prev.monto_nota_credito
        };
      },
      setModalOpen: setNotasModalOpen
    });
  };

  const guardarContabilizacion = async (event) => {
    event.preventDefault();
    try {
      setContaSaving(true);
      setContaError('');
      setContaMessage('');
      await facturaApi.saveContabilizacion(id, buildContabilizacionPayload({ conta }));
      setContaMessage('Contabilizacion guardada y estado actualizado.');
      await fetchAll();
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar la contabilizacion.';
      setContaError(apiError);
    } finally {
      setContaSaving(false);
    }
  };

  const registrarPagoRetencion = async (event) => {
    event.preventDefault();
    const monto = Number(retencionPagoMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      setRetencionPagoError('Ingrese un monto valido mayor a 0.');
      return;
    }

    try {
      setRetencionPagoSaving(true);
      setRetencionPagoError('');
      setRetencionPagoMessage('');
      await facturaApi.registrarPagoRetencion(id, buildRetencionPayload({
        monto,
        retencionPagoFecha,
        retencionPagoNotas
      }));
      setRetencionPagoMonto('');
      setRetencionPagoNotas('');
      setRetencionPagoMessage('Pago de retencion registrado.');
      await fetchAll();
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo registrar el pago de retencion.';
      setRetencionPagoError(apiError);
    } finally {
      setRetencionPagoSaving(false);
    }
  };

  return {
    handleContaChange,
    abrirAsociarTablaPago,
    asociarTablaPago,
    abrirAsociarOrdenCompra,
    asociarOrdenCompra,
    abrirAsociarNotaCredito,
    asociarNotaCredito,
    guardarContabilizacion,
    registrarPagoRetencion
  };
};
