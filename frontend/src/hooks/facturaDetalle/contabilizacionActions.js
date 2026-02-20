import { getNotaCreditoTotal } from './utils.js';

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
  const clearTablaSelection = () => {
    setTablasPagoProveedor([]);
    setTablaPagoActual(null);
    setTablasModalOpen(false);
    setTablasError('');
    setConta((prev) => ({
      ...prev,
      tabla_pago_id: ''
    }));
  };

  const clearNotaCreditoSelection = () => {
    setNotasCreditoProveedor([]);
    setNotaCreditoActual(null);
    setNotasModalOpen(false);
    setNotasError('');
    setConta((prev) => ({
      ...prev,
      nota_credito_id: '',
      monto_nota_credito: 0
    }));
  };

  const handleContaChange = (field) => (event) => {
    const nextValue = event.target.value;
    if (field === 'proveedor_id') {
      const proveedor = proveedoresSociedad.find((item) => String(item.id) === String(nextValue));
      clearTablaSelection();
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

  const abrirAsociarTablaPago = async () => {
    if (!factura?.sociedad_id) {
      setContaError('No se encontro la sociedad de la factura.');
      return;
    }

    const proveedorId = Number(conta.proveedor_id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      setContaError('Seleccione un proveedor para asociar la tabla de pagos.');
      return;
    }

    try {
      setTablasLoading(true);
      setTablasError('');
      const response = await facturaApi.getTablasPago({
        sociedadId: factura.sociedad_id,
        proveedorId
      });
      setTablasPagoProveedor(response.data?.data || []);
      setTablasModalOpen(true);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudieron cargar las tablas de pago.';
      setTablasError(apiError);
    } finally {
      setTablasLoading(false);
    }
  };

  const asociarTablaPago = (tabla) => {
    if (!tabla) return;
    setTablaPagoActual(tabla);
    setConta((prev) => ({
      ...prev,
      tabla_pago_id: String(tabla.id)
    }));
    setTablasModalOpen(false);
  };

  const abrirAsociarNotaCredito = async () => {
    if (!factura?.sociedad_id) {
      setContaError('No se encontro la sociedad de la factura.');
      return;
    }

    const proveedorId = Number(conta.proveedor_id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      setContaError('Seleccione un proveedor para asociar la nota de credito.');
      return;
    }

    try {
      setNotasLoading(true);
      setNotasError('');
      const response = await facturaApi.getNotasCredito({
        sociedadId: factura.sociedad_id,
        proveedorId
      });
      setNotasCreditoProveedor(response.data?.data || []);
      setNotasModalOpen(true);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudieron cargar las notas de credito.';
      setNotasError(apiError);
    } finally {
      setNotasLoading(false);
    }
  };

  const asociarNotaCredito = (notaCredito) => {
    if (!notaCredito) return;
    const montoNota = getNotaCreditoTotal(notaCredito);
    setNotaCreditoActual(notaCredito);
    setConta((prev) => ({
      ...prev,
      nota_credito_id: String(notaCredito.id),
      monto_nota_credito: montoNota ?? prev.monto_nota_credito
    }));
    setNotasModalOpen(false);
  };

  const guardarContabilizacion = async (event) => {
    event.preventDefault();
    try {
      setContaSaving(true);
      setContaError('');
      setContaMessage('');
      await facturaApi.saveContabilizacion(id, {
        ...conta,
        proveedor_id: conta.proveedor_id ? Number(conta.proveedor_id) : null,
        tabla_pago_id: conta.tabla_pago_id ? Number(conta.tabla_pago_id) : null,
        nota_credito_id: conta.nota_credito_id ? Number(conta.nota_credito_id) : null,
        monto_nota_credito: conta.monto_nota_credito === '' || Number.isNaN(Number(conta.monto_nota_credito))
          ? null
          : Number(conta.monto_nota_credito),
        usuario: 'admin'
      });
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
      await facturaApi.registrarPagoRetencion(id, {
        monto,
        fecha_pago: retencionPagoFecha || null,
        notas: retencionPagoNotas || null,
        usuario: 'admin'
      });
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
    abrirAsociarNotaCredito,
    asociarNotaCredito,
    guardarContabilizacion,
    registrarPagoRetencion
  };
};
