import { tramitesApi } from '../../services/tramitesApi.js';
import { promptMotivo } from '../../utils/promptUtils.js';
import { PROMPT_LABELS, TRAMITE_ALERT_LABELS } from '../../utils/uiLabels.js';
import TRAMITE_LABELS from '../../utils/tramiteLabels.js';

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

export const createTramiteWorkflowHandlers = ({
  workflowInputs,
  workflowState,
  dependencies = {}
}) => {
  const {
    api = tramitesApi,
    promptMotivoFn = promptMotivo,
    promptLabels = PROMPT_LABELS,
    alertLabels = TRAMITE_ALERT_LABELS,
    overrideLabels = TRAMITE_LABELS.override,
    actorUsuario = workflowInputs?.actorUsuario || 'system'
  } = dependencies;

  const {
    id,
    documentosActivos,
    fetchDetalle,
    setActionMessage,
    setActionError
  } = workflowInputs;

  const {
    overrideEstado,
    overrideMotivo,
    overrideUser,
    setOverrideEstado,
    setOverrideMotivo,
    setOverrideError,
    tesoreriaDestino,
    pagosFacturas
  } = workflowState;

  const handleDecision = async (facturaId, etapa, decision) => {
    try {
      setActionError('');
      setActionMessage('');
      const motivo = decision === 'rechazado' ? promptMotivoFn(promptLabels.rechazoMotivo) : null;
      await api.decisionDocumento(id, facturaId, {
        etapa,
        decision,
        motivo: motivo || null,
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.decisionSuccess);
      fetchDetalle();
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.decisionError;
      setActionError(apiError);
    }
  };

  const handleCambiarEstado = async (
    estado,
    forceOverride = false,
    motivoOverride = null,
    usuarioOverride = actorUsuario,
    extraPayload = {}
  ) => {
    try {
      setActionError('');
      setActionMessage('');
      await api.cambiarEstado(id, {
        estado,
        usuario: usuarioOverride,
        motivo: motivoOverride || null,
        force: forceOverride,
        ...extraPayload
      });
      setActionMessage(alertLabels.estadoSuccess);
      fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.estadoError;
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
        setActionError(alertLabels.tesoreriaDestinoRequired);
        return;
      }
      const motivo = accion === 'excluir'
        ? promptMotivoFn(promptLabels.exclusionMotivo)
        : accion === 'devolver_contabilidad'
          ? promptMotivoFn(promptLabels.devolucionContabilidadMotivo)
          : promptMotivoFn(promptLabels.motivoOpcional);
      if (accion === 'devolver_contabilidad' && !`${motivo ?? ''}`.trim()) {
        setActionError(alertLabels.tesoreriaMotivoRequired);
        return;
      }

      await api.accionTesoreria(id, facturaId, {
        accion,
        destino: destino || null,
        motivo: motivo || null,
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.tesoreriaSuccess);
      fetchDetalle();
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.tesoreriaError;
      setActionError(apiError);
    }
  };

  const handleOverrideEstado = async (event) => {
    event.preventDefault();
    if (!overrideEstado || !overrideMotivo) {
      setOverrideError(overrideLabels.required);
      return;
    }
    setOverrideError('');
    const ok = await handleCambiarEstado(overrideEstado, true, overrideMotivo, overrideUser);
    if (ok) {
      setOverrideEstado('');
      setOverrideMotivo('');
    }
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

    await handleCambiarEstado(estado, false, null, actorUsuario, {
      pagos_documentos: pagos
    });
  };

  return {
    handleDecision,
    handleAccionTesoreria,
    handleOverrideEstado,
    handleAccionSiguiente
  };
};
