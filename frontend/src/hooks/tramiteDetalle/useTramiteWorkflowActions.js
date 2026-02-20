import { useEffect, useMemo, useState } from 'react';
import { tramitesApi } from '../../services/tramitesApi';
import { getNextStateConfig } from '../../utils/tramiteWorkflow';
import { promptMotivo } from '../../utils/promptUtils';
import { PROMPT_LABELS, TRAMITE_ALERT_LABELS } from '../../utils/uiLabels';
import { getRoleByEstado } from '../../utils/tramiteConfig';
import TRAMITE_LABELS from '../../utils/tramiteLabels';

const PAGO_MONTO_EPSILON = 0.0001;

const buildPagosDocumentosPayload = ({ documentosActivos, pagosFacturas }) => {
  const pagos = [];

  for (const doc of documentosActivos) {
    const facturaId = Number(doc.factura_id);
    const pendiente = Number(doc.total_a_pagar || 0);
    if (!Number.isFinite(facturaId) || facturaId <= 0) {
      continue;
    }
    if (!Number.isFinite(pendiente) || pendiente <= 0) {
      continue;
    }

    const rawMonto = pagosFacturas[facturaId] ?? pendiente;
    const monto = Number(rawMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      return {
        error: `Monto invalido para factura #${doc.consecutivo || doc.clave || facturaId}`,
        pagos: []
      };
    }
    if (monto - pendiente > PAGO_MONTO_EPSILON) {
      return {
        error: `El monto para factura #${doc.consecutivo || doc.clave || facturaId} excede su saldo pendiente`,
        pagos: []
      };
    }

    pagos.push({
      factura_id: facturaId,
      monto_pago: Number(monto.toFixed(4))
    });
  }

  return { error: '', pagos };
};

export const useTramiteWorkflowActions = ({
  id,
  tramite,
  documentosActivos,
  fetchDetalle,
  fetchHistorial,
  setActionMessage,
  setActionError
}) => {
  const [rolActivo, setRolActivo] = useState('gerencia');
  const [historialVisible, setHistorialVisible] = useState(false);
  const [overrideEstado, setOverrideEstado] = useState('');
  const [overrideMotivo, setOverrideMotivo] = useState('');
  const [overrideUser, setOverrideUser] = useState('admin');
  const [overrideError, setOverrideError] = useState('');
  const [tesoreriaDestino, setTesoreriaDestino] = useState({});
  const [pagosFacturas, setPagosFacturas] = useState({});
  const [activeTab, setActiveTab] = useState('individual');

  const accionSiguiente = useMemo(
    () => getNextStateConfig(tramite?.estado),
    [tramite?.estado]
  );

  useEffect(() => {
    if (historialVisible) {
      fetchHistorial();
    }
  }, [historialVisible, id]);

  useEffect(() => {
    setPagosFacturas((prev) => {
      const next = {};
      documentosActivos.forEach((doc) => {
        const facturaId = Number(doc.factura_id);
        const pendiente = Number(doc.total_a_pagar || 0);
        if (!Number.isFinite(facturaId) || facturaId <= 0) {
          return;
        }
        if (!Number.isFinite(pendiente) || pendiente <= 0) {
          return;
        }
        next[facturaId] = prev[facturaId] ?? pendiente.toFixed(2);
      });
      return next;
    });
  }, [documentosActivos]);

  const handleDecision = async (facturaId, etapa, decision) => {
    try {
      setActionError('');
      setActionMessage('');
      const motivo = decision === 'rechazado' ? promptMotivo(PROMPT_LABELS.rechazoMotivo) : null;
      await tramitesApi.decisionDocumento(id, facturaId, {
        etapa,
        decision,
        motivo: motivo || null,
        usuario: 'admin'
      });
      setActionMessage(TRAMITE_ALERT_LABELS.decisionSuccess);
      fetchDetalle();
    } catch (err) {
      const apiError = err.response?.data?.error || TRAMITE_ALERT_LABELS.decisionError;
      setActionError(apiError);
    }
  };

  const handleCambiarEstado = async (
    estado,
    forceOverride = false,
    motivoOverride = null,
    usuarioOverride = 'admin',
    extraPayload = {}
  ) => {
    try {
      setActionError('');
      setActionMessage('');
      await tramitesApi.cambiarEstado(id, {
        estado,
        usuario: usuarioOverride,
        motivo: motivoOverride || null,
        force: forceOverride,
        ...extraPayload
      });
      setActionMessage(TRAMITE_ALERT_LABELS.estadoSuccess);
      fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || TRAMITE_ALERT_LABELS.estadoError;
      setActionError(apiError);
      return false;
    }
  };

  const handleAccionTesoreria = async (facturaId, accion) => {
    try {
      setActionError('');
      setActionMessage('');
      const destino = tesoreriaDestino[facturaId];
      if ((accion === 'reenviar' || accion === 'reincluir') && !destino) {
        setActionError(TRAMITE_ALERT_LABELS.tesoreriaDestinoRequired);
        return;
      }
      const motivo = accion === 'excluir'
        ? promptMotivo(PROMPT_LABELS.exclusionMotivo)
        : promptMotivo(PROMPT_LABELS.motivoOpcional);

      await tramitesApi.accionTesoreria(id, facturaId, {
        accion,
        destino: destino || null,
        motivo: motivo || null,
        usuario: 'admin'
      });
      setActionMessage(TRAMITE_ALERT_LABELS.tesoreriaSuccess);
      fetchDetalle();
    } catch (err) {
      const apiError = err.response?.data?.error || TRAMITE_ALERT_LABELS.tesoreriaError;
      setActionError(apiError);
    }
  };

  const handleOverrideEstado = async (event) => {
    event.preventDefault();
    if (!overrideEstado || !overrideMotivo) {
      setOverrideError(TRAMITE_LABELS.override.required);
      return;
    }
    setOverrideError('');
    const nextRole = getRoleByEstado(overrideEstado);
    const ok = await handleCambiarEstado(overrideEstado, true, overrideMotivo, overrideUser);
    if (ok) {
      if (nextRole) {
        setRolActivo(nextRole);
      }
      setOverrideEstado('');
      setOverrideMotivo('');
    }
  };

  const handleTesoreriaDestinoChange = (facturaId, value) => {
    setTesoreriaDestino((prev) => ({ ...prev, [facturaId]: value }));
  };

  const handlePagoFacturaChange = (facturaId, value) => {
    setPagosFacturas((prev) => ({
      ...prev,
      [facturaId]: value
    }));
  };

  const handleAccionSiguiente = async (estado) => {
    if (estado !== 'pagado') {
      await handleCambiarEstado(estado);
      return;
    }

    const { error: pagoError, pagos } = buildPagosDocumentosPayload({
      documentosActivos,
      pagosFacturas
    });
    if (pagoError) {
      setActionError(pagoError);
      return;
    }

    await handleCambiarEstado(estado, false, null, 'admin', {
      pagos_documentos: pagos
    });
  };

  return {
    rolActivo,
    setRolActivo,
    historialVisible,
    setHistorialVisible,
    overrideEstado,
    setOverrideEstado,
    overrideMotivo,
    setOverrideMotivo,
    overrideUser,
    setOverrideUser,
    overrideError,
    tesoreriaDestino,
    pagosFacturas,
    activeTab,
    setActiveTab,
    accionSiguiente,
    handleDecision,
    handleAccionTesoreria,
    handleOverrideEstado,
    handleTesoreriaDestinoChange,
    handlePagoFacturaChange,
    handleAccionSiguiente
  };
};
