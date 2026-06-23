import { tramitesApi } from '../../services/tramitesApi.js';
import { toBase64 } from '../tablasPago/utils.js';
import { promptMotivo } from '../../utils/promptUtils.js';
import { PROMPT_LABELS, TRAMITE_ALERT_LABELS } from '../../utils/uiLabels.js';
import TRAMITE_LABELS from '../../utils/tramiteLabels.js';
import { getDocumentoConsecutivo } from '../../utils/formatters.js';

const PAGO_MONTO_EPSILON = 0.0001;
const PAGO_DISPLAY_DECIMALS = 2;

const roundPagoForDisplay = (value) => Number(Number(value || 0).toFixed(PAGO_DISPLAY_DECIMALS));
const shouldClampPagoToPendiente = ({ monto, pendiente }) => (
  monto - pendiente > PAGO_MONTO_EPSILON
  && roundPagoForDisplay(monto) === roundPagoForDisplay(pendiente)
);

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

    const montoProgramado = Number(doc.monto_pago_programado);
    const rawMonto = pagosFacturas[facturaId] ?? (
      Number.isFinite(montoProgramado) && montoProgramado > 0
        ? montoProgramado
        : pendiente
    );
    const monto = Number(rawMonto);
    const documentoVisible = getDocumentoConsecutivo(doc, String(facturaId));
    if (!Number.isFinite(monto) || monto <= 0) {
      return {
        error: `Monto invalido para factura #${documentoVisible}`,
        pagos: []
      };
    }
    const montoNormalizado = shouldClampPagoToPendiente({ monto, pendiente })
      ? pendiente
      : monto;
    if (montoNormalizado - pendiente > PAGO_MONTO_EPSILON) {
      return {
        error: `El monto para factura #${documentoVisible} excede su saldo pendiente`,
        pagos: []
      };
    }

    pagos.push({
      factura_id: facturaId,
      monto_pago: Number(montoNormalizado.toFixed(4))
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
    setUploadingCaratulas,
    setResolvingCaratulaGroupKey,
    setUploadingProviderKey,
    setConfirmingProviderKey,
    setConfirmingOrderProviderKey,
    setOrphanActionId,
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

  const handleUploadCaratulas = async (file) => {
    if (!file) {
      setActionError(alertLabels.caratulasFileRequired);
      return false;
    }

    try {
      setActionError('');
      setActionMessage('');
      setUploadingCaratulas(true);
      const fileBase64 = await toBase64(file);
      await api.uploadCaratulas(id, {
        filename: file.name,
        file_base64: fileBase64,
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.caratulasUploadSuccess);
      await fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.caratulasUploadError;
      setActionError(apiError);
      return false;
    } finally {
      setUploadingCaratulas(false);
    }
  };

  const handleResolveCaratulas = async ({ groupKey, providerFacturaId, lineMatches }) => {
    try {
      setActionError('');
      setActionMessage('');
      setResolvingCaratulaGroupKey(groupKey);
      await api.resolveCaratulas(id, {
        group_key: groupKey,
        provider_factura_id: providerFacturaId || null,
        line_matches: Array.isArray(lineMatches) ? lineMatches : [],
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.caratulasResolveSuccess);
      await fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.caratulasResolveError;
      setActionError(apiError);
      return false;
    } finally {
      setResolvingCaratulaGroupKey('');
    }
  };

  const handleConfirmProviderOrder = async ({ providerKey, facturaIds, orderSource }) => {
    try {
      setActionError('');
      setActionMessage('');
      setConfirmingOrderProviderKey(providerKey);
      await api.confirmProviderCaratulaOrder(id, providerKey, {
        factura_ids: Array.isArray(facturaIds) ? facturaIds : [],
        order_source: orderSource || 'manual',
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.caratulasResolveSuccess);
      await fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.caratulasResolveError;
      setActionError(apiError);
      return false;
    } finally {
      setConfirmingOrderProviderKey('');
    }
  };

  const handleUploadProviderCaratula = async ({ providerKey, file }) => {
    if (!file) {
      setActionError(alertLabels.caratulasFileRequired);
      return false;
    }

    try {
      setActionError('');
      setActionMessage('');
      setUploadingProviderKey(providerKey);
      const fileBase64 = await toBase64(file);
      await api.uploadProviderCaratula(id, providerKey, {
        filename: file.name,
        file_base64: fileBase64,
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.caratulasUploadSuccess);
      await fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.caratulasUploadError;
      setActionError(apiError);
      return false;
    } finally {
      setUploadingProviderKey('');
    }
  };

  const handleConfirmProviderCaratula = async ({ providerKey }) => {
    try {
      setActionError('');
      setActionMessage('');
      setConfirmingProviderKey(providerKey);
      await api.confirmProviderCaratula(id, providerKey, {
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.caratulasResolveSuccess);
      await fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.caratulasResolveError;
      setActionError(apiError);
      return false;
    } finally {
      setConfirmingProviderKey('');
    }
  };

  const handleAssignOrphanCaratula = async ({ orphanId, providerKey }) => {
    try {
      setActionError('');
      setActionMessage('');
      setOrphanActionId(`assign:${orphanId}`);
      await api.assignOrphanCaratula(id, orphanId, {
        provider_key: providerKey,
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.caratulasResolveSuccess);
      await fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.caratulasResolveError;
      setActionError(apiError);
      return false;
    } finally {
      setOrphanActionId('');
    }
  };

  const handleDiscardOrphanCaratula = async ({ orphanId }) => {
    try {
      setActionError('');
      setActionMessage('');
      setOrphanActionId(`discard:${orphanId}`);
      await api.discardOrphanCaratula(id, orphanId, {
        usuario: actorUsuario
      });
      setActionMessage(alertLabels.caratulasResolveSuccess);
      await fetchDetalle();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || alertLabels.caratulasResolveError;
      setActionError(apiError);
      return false;
    } finally {
      setOrphanActionId('');
    }
  };

  const handleAccionSiguiente = async (estado) => {
    const shouldSendPagosDocumentos = estado === 'pagado' || estado === 'en_aprobacion_gerencia_contable';

    if (!shouldSendPagosDocumentos) {
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
    handleUploadCaratulas,
    handleResolveCaratulas,
    handleConfirmProviderOrder,
    handleUploadProviderCaratula,
    handleConfirmProviderCaratula,
    handleAssignOrphanCaratula,
    handleDiscardOrphanCaratula,
    handleOverrideEstado,
    handleAccionSiguiente
  };
};
