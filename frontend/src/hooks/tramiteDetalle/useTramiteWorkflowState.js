import { useEffect, useMemo, useState } from 'react';
import { getNextStateConfig } from '../../utils/tramiteWorkflow.js';

export const useTramiteWorkflowState = ({
  id,
  tramite,
  documentosActivos,
  actorUsuario,
  fetchHistorial
}) => {
  const [historialVisible, setHistorialVisible] = useState(false);
  const [overrideEstado, setOverrideEstado] = useState('');
  const [overrideMotivo, setOverrideMotivo] = useState('');
  const [overrideUserState, setOverrideUserState] = useState(() => ({
    actorUsuario,
    value: actorUsuario || 'system',
  }));
  const [overrideError, setOverrideError] = useState('');
  const [tesoreriaDestino, setTesoreriaDestino] = useState({});
  const [pagosFacturas, setPagosFacturas] = useState({});
  const [activeTab, setActiveTab] = useState('individual');
  const [uploadingCaratulas, setUploadingCaratulas] = useState(false);
  const [resolvingCaratulaGroupKey, setResolvingCaratulaGroupKey] = useState('');
  const [uploadingProviderKey, setUploadingProviderKey] = useState('');
  const [confirmingProviderKey, setConfirmingProviderKey] = useState('');
  const [confirmingOrderProviderKey, setConfirmingOrderProviderKey] = useState('');
  const [orphanActionId, setOrphanActionId] = useState('');
  const [providerSortDirection, setProviderSortDirection] = useState('asc');

  const accionSiguiente = useMemo(
    () => getNextStateConfig(tramite?.estado),
    [tramite?.estado]
  );

  useEffect(() => {
    if (historialVisible) {
      fetchHistorial();
    }
  }, [historialVisible, id, fetchHistorial]);

  const overrideUser = overrideUserState.actorUsuario === actorUsuario
    ? overrideUserState.value
    : (actorUsuario || 'system');

  const setOverrideUser = (value) => {
    setOverrideUserState({
      actorUsuario,
      value,
    });
  };

  const pagosFacturasConPendiente = useMemo(() => {
    const next = {};
    documentosActivos.forEach((doc) => {
      const facturaId = Number(doc.factura_id);
      const pendiente = Number(doc.total_a_pagar || 0);
      const montoProgramado = Number(doc.monto_pago_programado);
      if (!Number.isFinite(facturaId) || facturaId <= 0) {
        return;
      }
      if (!Number.isFinite(pendiente) || pendiente <= 0) {
        return;
      }
      const defaultMonto = Number.isFinite(montoProgramado) && montoProgramado > 0
        ? montoProgramado
        : pendiente;
      next[facturaId] = pagosFacturas[facturaId] ?? defaultMonto.toFixed(2);
    });
    return next;
  }, [documentosActivos, pagosFacturas]);

  const handleTesoreriaDestinoChange = (facturaId, value) => {
    setTesoreriaDestino((prev) => ({ ...prev, [facturaId]: value }));
  };

  const handlePagoFacturaChange = (facturaId, value) => {
    setPagosFacturas((prev) => ({
      ...prev,
      [facturaId]: value
    }));
  };

  return {
    historialVisible,
    setHistorialVisible,
    overrideEstado,
    setOverrideEstado,
    overrideMotivo,
    setOverrideMotivo,
    overrideUser,
    setOverrideUser,
    overrideError,
    setOverrideError,
    tesoreriaDestino,
    pagosFacturas: pagosFacturasConPendiente,
    activeTab,
    setActiveTab,
    accionSiguiente,
    uploadingCaratulas,
    setUploadingCaratulas,
    resolvingCaratulaGroupKey,
    setResolvingCaratulaGroupKey,
    uploadingProviderKey,
    setUploadingProviderKey,
    confirmingProviderKey,
    setConfirmingProviderKey,
    confirmingOrderProviderKey,
    setConfirmingOrderProviderKey,
    orphanActionId,
    setOrphanActionId,
    providerSortDirection,
    setProviderSortDirection,
    handleTesoreriaDestinoChange,
    handlePagoFacturaChange
  };
};
