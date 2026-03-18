import { getNotaCreditoTotal } from './utils.js';
import {
  buildCentroCostoResumen,
  createCentroCostoLinea,
  createCentroCostoSnapshot,
  ensureCentrosCostoMetadata,
} from '../../utils/centrosCosto.js';

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

const buildContaWithUpdatedCentrosCosto = ({ conta, lineas }) => {
  const metadata = ensureCentrosCostoMetadata(conta?.metadata);
  metadata.centros_costo_lineas = Array.isArray(lineas) ? lineas : [];

  return {
    ...conta,
    metadata,
    centro_costo: buildCentroCostoResumen(metadata.centros_costo_lineas),
  };
};

const buildContabilizacionPayload = ({ conta, workflowAction }) => {
  const nextConta = buildContaWithUpdatedCentrosCosto({
    conta,
    lineas: ensureCentrosCostoMetadata(conta?.metadata).centros_costo_lineas,
  });

  return {
    ...nextConta,
    proveedor_id: nextConta.proveedor_id ? Number(nextConta.proveedor_id) : null,
    tabla_pago_id: nextConta.tabla_pago_id ? Number(nextConta.tabla_pago_id) : null,
    orden_compra_id: nextConta.orden_compra_id ? Number(nextConta.orden_compra_id) : null,
    nota_credito_id: nextConta.nota_credito_id ? Number(nextConta.nota_credito_id) : null,
    monto_nota_credito: nextConta.monto_nota_credito === '' || Number.isNaN(Number(nextConta.monto_nota_credito))
      ? null
      : Number(nextConta.monto_nota_credito),
    workflow_action: workflowAction,
    usuario: 'admin',
  };
};

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

const createHandleContaChangeAction = ({ setConta }) => (field) => (event) => {
  const nextValue = event.target.value;
  setConta((prev) => ({ ...prev, [field]: nextValue }));
};

const updateCentrosCostoLineas = ({ setConta, updater }) => {
  setConta((previous) => {
    const metadata = ensureCentrosCostoMetadata(previous.metadata, { preserveEmpty: true });
    const nextLineas = updater(metadata.centros_costo_lineas);
    return buildContaWithUpdatedCentrosCosto({
      conta: previous,
      lineas: nextLineas,
    });
  });
};

const validateCentrosCostoDistribution = ({
  conta,
  workflowAction,
  setContaError,
}) => {
  if (workflowAction === 'save_draft') {
    return true;
  }

  const metadata = ensureCentrosCostoMetadata(conta?.metadata, { preserveEmpty: true });
  const lineas = Array.isArray(metadata.centros_costo_lineas) ? metadata.centros_costo_lineas : [];
  const lineasAsignadas = lineas.filter((linea) => linea.centro_costo_id || linea.codigo || linea.nombre);
  const hasIncompleteLines = lineas.some((linea) => !linea.centro_costo_id || !linea.codigo);

  if (lineasAsignadas.length === 0) {
    setContaError('Agrega al menos un centro de costo antes de continuar.');
    return false;
  }

  if (hasIncompleteLines) {
    setContaError('Completa todas las lineas de centros de costo antes de continuar.');
    return false;
  }

  return true;
};

export const createContabilizacionActions = ({
  id,
  factura,
  conta,
  setConta,
  setContaSaving,
  setContaSavingAction,
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
  centrosCostoCatalogo,
  setCentrosCostoModalOpen,
  setCentrosCostoTargetLineId,
  setCentrosCostoError,
  setCentrosCostoLoading,
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
  const handleContaChange = createHandleContaChangeAction({ setConta });

  const addCentroCostoLinea = () => {
    updateCentrosCostoLineas({
      setConta,
      updater: (lineas) => [...lineas, createCentroCostoLinea()],
    });
  };

  const removeCentroCostoLinea = (localId) => {
    updateCentrosCostoLineas({
      setConta,
      updater: (lineas) => {
        const nextLineas = lineas.filter((linea) => linea.local_id !== localId);
        return nextLineas.length > 0 ? nextLineas : [createCentroCostoLinea()];
      },
    });
  };

  const actualizarMontoCentroCosto = (localId, monto) => {
    updateCentrosCostoLineas({
      setConta,
      updater: (lineas) => lineas.map((linea) => (
        linea.local_id === localId
          ? { ...linea, monto }
          : linea
      )),
    });
  };

  const seleccionarCentroCostoEnLinea = (localId, centro) => {
    if (!centro) {
      return;
    }

    setCentrosCostoError('');
    updateCentrosCostoLineas({
      setConta,
      updater: (lineas) => lineas.map((linea) => (
        linea.local_id === localId
          ? createCentroCostoSnapshot(centro, {
            local_id: linea.local_id,
            monto: linea.monto,
          })
          : linea
      )),
    });
    setCentrosCostoModalOpen(false);
    setCentrosCostoTargetLineId('');
  };

  const abrirSelectorCentrosCosto = (localId) => {
    setCentrosCostoError('');
    setCentrosCostoLoading(false);

    if (!Array.isArray(centrosCostoCatalogo) || centrosCostoCatalogo.length === 0) {
      setCentrosCostoError('No hay centros de costo cargados para esta sociedad.');
      return;
    }

    setCentrosCostoTargetLineId(localId);
    setCentrosCostoModalOpen(true);
  };

  const cerrarSelectorCentrosCosto = () => {
    setCentrosCostoModalOpen(false);
    setCentrosCostoTargetLineId('');
  };

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
    const context = resolveAssociationContext('No se encontro el proveedor de esta factura para asociar la tabla de pagos.');
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
    const context = resolveAssociationContext('No se encontro el proveedor de esta factura para asociar la orden de compra.');
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
    const context = resolveAssociationContext('No se encontro el proveedor de esta factura para asociar la nota de credito.');
    if (!context) {
      return;
    }

    await loadAssociationCandidates({
      fetchItems: async () => {
        const response = await facturaApi.getNotasCredito({
          sociedadId: context.sociedadId,
          proveedorId: context.proveedorId
        });
        const payload = response.data?.data;
        if (Array.isArray(payload)) {
          return payload;
        }
        return Array.isArray(payload?.items) ? payload.items : [];
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

  const persistContabilizacion = async ({ workflowAction, successMessage, errorMessage }) => {
    try {
      setContaSaving(true);
      setContaSavingAction?.(workflowAction);
      setContaError('');
      setContaMessage('');

      if (!validateCentrosCostoDistribution({
        conta,
        workflowAction,
        setContaError,
      })) {
        return;
      }

      await facturaApi.saveContabilizacion(id, buildContabilizacionPayload({ conta, workflowAction }));
      setContaMessage(successMessage);
      await fetchAll();
    } catch (err) {
      const apiError = err.response?.data?.error || errorMessage;
      setContaError(apiError);
    } finally {
      setContaSaving(false);
      setContaSavingAction?.('');
    }
  };

  const guardarBorrador = async (event) => {
    event?.preventDefault?.();
    await persistContabilizacion({
      workflowAction: 'save_draft',
      successMessage: 'Borrador guardado en revision contable.',
      errorMessage: 'No se pudo guardar el borrador.'
    });
  };

  const marcarEnRevision = async (event) => {
    event?.preventDefault?.();
    await persistContabilizacion({
      workflowAction: 'mark_in_review',
      successMessage: 'Documento marcado en revision contable.',
      errorMessage: 'No se pudo marcar el documento en revision.'
    });
  };

  const guardarContabilizacion = async (event) => {
    event?.preventDefault?.();
    await persistContabilizacion({
      workflowAction: 'finalize',
      successMessage: 'Contabilizacion guardada correctamente.',
      errorMessage: 'No se pudo guardar la contabilizacion.'
    });
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
    addCentroCostoLinea,
    removeCentroCostoLinea,
    actualizarMontoCentroCosto,
    abrirSelectorCentrosCosto,
    cerrarSelectorCentrosCosto,
    seleccionarCentroCostoEnLinea,
    guardarBorrador,
    marcarEnRevision,
    guardarContabilizacion,
    registrarPagoRetencion
  };
};
